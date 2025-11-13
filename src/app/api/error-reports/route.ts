/**
 * API endpoint for error reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

import { extractClientKey, rateLimit } from '@/server/rateLimit'
import { logger } from '@/utils/logger'

interface ErrorReportData {
  type: 'bug' | 'performance' | 'feature' | 'other'
  title: string
  description: string
  steps?: string
  expectedBehavior?: string
  actualBehavior?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  userEmail?: string
  browserInfo: {
    userAgent: string
    url: string
    timestamp: string
  }
  systemInfo?: {
    component?: string
    errorMessage?: string
    stackTrace?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const key = extractClientKey(request)
    if (!rateLimit({ key, limit: 5, windowMs: 60_000 })) {
      return NextResponse.json({ error: 'Too many error reports' }, { status: 429 })
    }

    const reportData: ErrorReportData = await request.json()

    // Validate required fields
    if (!reportData.title?.trim() || !reportData.description?.trim()) {
      return NextResponse.json({ 
        error: 'Title and description are required' 
      }, { status: 400 })
    }

    // Generate report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create error report object
    const errorReport = {
      id: reportId,
      ...reportData,
      status: 'submitted' as const,
      createdAt: new Date().toISOString(),
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown'
    }

    // Log the error report
    logger.info('[ErrorReports] New error report received', {
      reportId,
      type: reportData.type,
      priority: reportData.priority,
      title: reportData.title,
      userEmail: reportData.userEmail,
      component: reportData.systemInfo?.component,
      url: reportData.browserInfo?.url
    })

    // Store the report (in a real implementation, this would go to a database)
    await storeErrorReport(errorReport)

    // Send notifications for high priority reports
    if (reportData.priority === 'critical' || reportData.priority === 'high') {
      await sendHighPriorityNotification(errorReport)
    }

    // Auto-categorize and assign if possible
    const category = categorizeReport(reportData)
    const assignee = getAutoAssignee(reportData, category)

    logger.info('[ErrorReports] Report processed', {
      reportId,
      category,
      assignee
    })

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Error report submitted successfully',
      estimatedResponse: getEstimatedResponseTime(reportData.priority)
    })

  } catch (error: any) {
    logger.error('[ErrorReports] Failed to process error report', error)

    return NextResponse.json({
      error: 'Failed to submit error report'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const FALLBACK_ALLOW = process.env.NODE_ENV !== 'production'
    let isAdmin = FALLBACK_ALLOW
    try {
      const { userId } = await auth()
      const admins = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
      isAdmin = admins.length > 0 ? (userId ? admins.includes(userId) : false) : FALLBACK_ALLOW
    } catch {
      isAdmin = FALLBACK_ALLOW
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    // This endpoint could be used by admins to view error reports
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const status = url.searchParams.get('status')
    const priority = url.searchParams.get('priority')

    // In a real implementation, this would query a database
    const reports = await getErrorReports({ limit, status, priority })

    return NextResponse.json({
      reports,
      total: reports.length
    })

  } catch (error: any) {
    logger.error('[ErrorReports] Failed to fetch error reports', error)

    return NextResponse.json({
      error: 'Failed to fetch error reports'
    }, { status: 500 })
  }
}

/**
 * Store error report (placeholder implementation)
 */
async function storeErrorReport(report: any): Promise<void> {
  // In a real implementation, this would store to a database
  // For now, we'll just log it
  logger.info('[ErrorReports] Storing report', {
    reportId: report.id,
    type: report.type,
    priority: report.priority
  })

  // Could also send to external services like:
  // - Sentry
  // - GitHub Issues
  // - Slack
  // - Email
}

/**
 * Send notification for high priority reports
 */
async function sendHighPriorityNotification(report: any): Promise<void> {
  try {
    // Send webhook notification if configured
    if (process.env.ERROR_REPORT_WEBHOOK_URL) {
      await fetch(process.env.ERROR_REPORT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `🚨 High Priority Error Report: ${report.title}`,
          attachments: [{
            color: report.priority === 'critical' ? 'danger' : 'warning',
            fields: [
              {
                title: 'Type',
                value: report.type,
                short: true
              },
              {
                title: 'Priority',
                value: report.priority,
                short: true
              },
              {
                title: 'Description',
                value: report.description.substring(0, 200) + (report.description.length > 200 ? '...' : ''),
                short: false
              },
              {
                title: 'URL',
                value: report.browserInfo?.url,
                short: false
              }
            ]
          }]
        })
      })
    }

    logger.info('[ErrorReports] High priority notification sent', {
      reportId: report.id
    })

  } catch (error: any) {
    logger.error('[ErrorReports] Failed to send notification', error)
  }
}

/**
 * Categorize error report automatically
 */
function categorizeReport(report: ErrorReportData): string {
  const title = report.title.toLowerCase()
  const description = report.description.toLowerCase()
  const component = report.systemInfo?.component?.toLowerCase()

  // UI/Frontend issues
  if (component?.includes('component') || title.includes('interface') || title.includes('botão')) {
    return 'frontend'
  }

  // API/Backend issues
  if (title.includes('api') || title.includes('servidor') || description.includes('500') || description.includes('erro interno')) {
    return 'backend'
  }

  // Database issues
  if (title.includes('dados') || description.includes('database') || description.includes('não salvou')) {
    return 'database'
  }

  // Performance issues
  if (report.type === 'performance' || title.includes('lento') || title.includes('demora')) {
    return 'performance'
  }

  // Authentication issues
  if (title.includes('login') || title.includes('autenticação') || description.includes('não consegue entrar')) {
    return 'auth'
  }

  return 'general'
}

/**
 * Auto-assign report based on category and content
 */
function getAutoAssignee(report: ErrorReportData, category: string): string {
  // In a real implementation, this would assign to actual team members
  switch (category) {
    case 'frontend':
      return 'frontend-team'
    case 'backend':
      return 'backend-team'
    case 'database':
      return 'devops-team'
    case 'performance':
      return 'performance-team'
    case 'auth':
      return 'security-team'
    default:
      return 'general-support'
  }
}

/**
 * Get estimated response time based on priority
 */
function getEstimatedResponseTime(priority: string): string {
  switch (priority) {
    case 'critical':
      return '1-2 horas'
    case 'high':
      return '4-8 horas'
    case 'medium':
      return '1-2 dias'
    case 'low':
      return '3-5 dias'
    default:
      return '1-2 dias'
  }
}

/**
 * Get error reports (placeholder implementation)
 */
async function getErrorReports(filters: {
  limit: number
  status?: string | null
  priority?: string | null
}): Promise<any[]> {
  // In a real implementation, this would query a database
  // For now, return empty array
  return []
}
