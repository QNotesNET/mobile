// app/api/admin/notebooks/[id]/route.ts
import { NextResponse } from "next/server";
import connectToDB from "@/lib/mongoose";
import Notebook from "@/models/Notebook";
import Page from "@/models/PageModel";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/notebooks/:id
 * Liefert Detailinfos zu einem Notebook (nur Admin).
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const me = await getCurrentUser();
        if (!me || me.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await connectToDB();

        const nb = await Notebook.findById(id).lean();
        if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Besitzer-E-Mail (falls vorhanden)
        let ownerEmail = "";
        // @ts-expect-error --- Typing
        if (nb.ownerId) {
            // @ts-expect-error --- Typing
            const owner = await User.findById(nb.ownerId).lean();
            ownerEmail = owner?.email ?? "";
        }

        // Seiten zählen
        const totalPages = await Page.countDocuments({
            notebookId: new Types.ObjectId(id),
        });

        // GESCANNTE Seiten: Page.images existiert und ist nicht leer
        // (Passe das an, wenn du einen anderen Scan-Indikator hast)
        const scannedPages = await Page.countDocuments({
            notebookId: new Types.ObjectId(id),
            images: { $exists: true, $ne: [] },
        });
        // @ts-expect-error --- Typing
        const sharedWithCount = Array.isArray((nb).sharedWith)
            // @ts-expect-error --- Typing
            ? (nb).sharedWith.length
            : 0;

        return NextResponse.json(
            {
                // @ts-expect-error --- Typing
                _id: String(nb._id),
                // @ts-expect-error --- Typing
                title: nb.title,
                ownerEmail,
                totalPages,
                scannedPages,
                // @ts-expect-error --- Typing
                createdAt: nb.createdAt ?? null,
                sharedWithCount,
                // @ts-expect-error --- Typing
                projectId: (nb).projectId ?? null,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("[API] GET /api/admin/notebooks/[id] failed:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * PATCH  /api/admin/notebooks/:id
 * Notebook umbenennen (nur Admin).
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const me = await getCurrentUser();
        if (!me || me.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const update: Record<string, unknown> = {};
        if (typeof body.title === "string" && body.title.trim().length) {
            update.title = body.title.trim();
        }

        await connectToDB();

        const doc = await Notebook.findByIdAndUpdate(id, update, { new: true }).lean<{
            _id: Types.ObjectId;
            title: string;
            ownerId: Types.ObjectId;
            createdAt?: Date;
        } | null>();

        if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json(
            {
                _id: String(doc._id),
                title: doc.title,
                ownerId: String(doc.ownerId),
                createdAt: doc.createdAt ?? null,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("[API] PATCH /api/admin/notebooks/[id] failed:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * DELETE  /api/admin/notebooks/:id
 * Pages löschen, dann Notebook löschen (nur Admin).
 */
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const me = await getCurrentUser();
        if (!me || me.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        await connectToDB();

        // erst Pages löschen, dann Notebook
        await Page.deleteMany({ notebookId: new Types.ObjectId(id) });
        const res = await Notebook.findByIdAndDelete(id).lean();
        if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err) {
        console.error("[API] DELETE /api/admin/notebooks/[id] failed:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
