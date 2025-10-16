import { getCurrentUser } from '@/lib/session';
import React from 'react'
import AdminPageClient from './ClientPage';

export default async function AdminPage() {

  const user = await getCurrentUser()
  const role = user?.role

  if (role !== "admin") return
  return (
    <div>
      <AdminPageClient />
    </div>
  )
}
