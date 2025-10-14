import { NextResponse } from "next/server";
// import { getCurrentUser } from "@/lib/session";
import { connectToDB } from "@/lib/mongoose";

export async function GET() {
    await connectToDB();
    //   const user = await getCurrentUser();
    //   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    //   const uidStr = String(user.id);
    //   let uidObj: Types.ObjectId | null = null;
    //   try { uidObj = new Types.ObjectId(uidStr); } catch { uidObj = null; }

    //   const pipeline: PipelineStage[] = [
    //     { $addFields: { ownerIdStr: { $toString: "$ownerId" } } },
    //     {
    //       $match: {
    //         $or: [
    //           ...(uidObj ? [{ ownerId: uidObj }] : []),
    //           { ownerId: uidStr },
    //           { ownerIdStr: uidStr },
    //         ],
    //       },
    //     },
    //     { $sort: { createdAt: -1 } },
    //     { $project: { _id: 1, title: 1, createdAt: 1, updatedAt: 1 } },
    //   ];

    //   const docs = (await Notebook.aggregate(pipeline).exec()) as AggOut[];
    //   const items = docs.map((d) => ({
    //     id: String(d._id),
    //     title: d.title,
    //     createdAt: d.createdAt,
    //     updatedAt: d.updatedAt,
    //   }));

    return NextResponse.json([
        {
            user: "DanielR",
            domain: "nexoro.nexoro.net",
            text: "Dies ist ein Test"
        },
        {
            user: "WolfgangP",
            domain: "nexoro.nexoro.net",
            text: "Dies ist ein Test"
        }
    ]
    );
}