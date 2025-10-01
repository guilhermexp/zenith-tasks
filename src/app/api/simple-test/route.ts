import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()
    
    return NextResponse.json({
      success: true,
      echo: message,
      timestamp: new Date().toISOString(),
      provider: 'test'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      success: false
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Simple test endpoint working',
    timestamp: new Date().toISOString()
  })
}