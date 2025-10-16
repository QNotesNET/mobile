/* eslint-disable @typescript-eslint/no-explicit-any */
import TaskBoard from "@/components/todos/TaskBoard";
import { getCurrentUser } from "@/lib/session";
import { connectToDB } from "@/lib/mongoose";
import User from "@/models/User";
import { TaskList } from "@/models/TaskList";

export default async function Page() {
  const session = await getCurrentUser();
  if (!session) {
    return (
      <div className="p-10 text-center text-gray-500">Nicht eingeloggt</div>
    );
  }

  await connectToDB();

  let user = await User.findOne({ email: session.email }).lean();
  if (!user) {
    user = (
      await User.create({
        email: session.email,
        name: session.email.split("@")[0],
      })
    ).toObject();
  }


  const hasLists = await TaskList.exists({ userId: user._id });
  if (!hasLists) {
    const name =
      (user as any).name?.trim() || String(session.email).split("@")[0];
    await TaskList.create({
      name,
      userId: user._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return <TaskBoard userId={String(user._id)} />;
}
