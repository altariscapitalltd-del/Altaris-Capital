import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const [totalUsers,verifiedUsers,activeUsers,newToday,pendingDeposits,pendingKyc,pendingWithdrawals,totalDeposited,totalWithdrawn,allBalances,recentSignups] = await Promise.all([
    prisma.user.count({ where:{role:'USER'} }),
    prisma.user.count({ where:{role:'USER',kycStatus:'APPROVED'} }),
    prisma.user.count({ where:{role:'USER',lastLoginAt:{gte:thirtyDaysAgo}} }),
    prisma.user.count({ where:{role:'USER',createdAt:{gte:todayStart}} }),
    prisma.transaction.count({ where:{type:'DEPOSIT',status:'PENDING'} }),
    prisma.kycSubmission.count({ where:{status:'PENDING_REVIEW'} }),
    prisma.transaction.count({ where:{type:'WITHDRAWAL',status:'PENDING'} }),
    prisma.transaction.aggregate({ where:{type:'DEPOSIT',status:'SUCCESS'}, _sum:{amount:true} }),
    prisma.transaction.aggregate({ where:{type:'WITHDRAWAL',status:'SUCCESS'}, _sum:{amount:true} }),
    prisma.balance.aggregate({ where:{currency:'USD'}, _sum:{amount:true} }),
    prisma.user.findMany({ where:{role:'USER',createdAt:{gte:new Date(Date.now()-24*60*60*1000)}}, select:{id:true,name:true,email:true,createdAt:true,lastKnownCountry:true}, orderBy:{createdAt:'desc'}, take:10 }),
  ])
  return NextResponse.json({ stats:{totalUsers,verifiedUsers,activeUsers,newToday,pendingDeposits,pendingKyc,pendingWithdrawals,totalDeposited:totalDeposited._sum.amount||0,totalWithdrawn:totalWithdrawn._sum.amount||0,totalAUM:allBalances._sum.amount||0}, recentSignups })
}
