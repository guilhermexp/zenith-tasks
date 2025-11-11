import { NextRequest, NextResponse } from 'next/server';
import { featureFlagManager, type FeatureFlag } from '@/config/features';
import { logger } from '@/utils/logger';

/**
 * GET /api/admin/feature-flags
 * Get all feature flags and their status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const flags = featureFlagManager.getAllFlags();
    const statistics = featureFlagManager.getStatistics();

    // If userId provided, check enabled features for that user
    let enabledForUser: string[] | undefined;
    if (userId) {
      enabledForUser = featureFlagManager.getEnabledFeatures(userId);
    }

    logger.info('Feature flags retrieved', {
      provider: 'FeatureFlagsAPI',
      userId,
      flagCount: flags.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          flags,
          statistics,
          enabledForUser,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to retrieve feature flags', error, {
      provider: 'FeatureFlagsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve feature flags',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/feature-flags
 * Set a feature flag override (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // const isAdmin = await checkAdminPermissions(request);
    // if (!isAdmin) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized', message: 'Admin access required' },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();

    // Validate request body
    if (!body.featureKey || typeof body.featureKey !== 'string') {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'featureKey is required',
        },
        { status: 400 }
      );
    }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'enabled must be a boolean',
        },
        { status: 400 }
      );
    }

    // Check if flag exists
    const flag = featureFlagManager.getFlag(body.featureKey);
    if (!flag) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: `Feature flag "${body.featureKey}" not found`,
        },
        { status: 404 }
      );
    }

    // Set override
    featureFlagManager.setOverride(body.featureKey, body.enabled);

    logger.info('Feature flag override set', {
      provider: 'FeatureFlagsAPI',
      featureKey: body.featureKey,
      enabled: body.enabled,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Feature flag "${body.featureKey}" override set to ${body.enabled}`,
        flag: featureFlagManager.getFlag(body.featureKey),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to set feature flag override', error, {
      provider: 'FeatureFlagsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to set feature flag override',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/feature-flags
 * Update a feature flag configuration (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // TODO: Add admin authentication check

    const body = await request.json();

    // Validate request body
    if (!body.featureKey || typeof body.featureKey !== 'string') {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'featureKey is required',
        },
        { status: 400 }
      );
    }

    // Check if flag exists
    const flag = featureFlagManager.getFlag(body.featureKey);
    if (!flag) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: `Feature flag "${body.featureKey}" not found`,
        },
        { status: 404 }
      );
    }

    // Extract updates
    const { featureKey, ...updates } = body;

    // Update flag
    featureFlagManager.updateFlag(featureKey, updates);

    logger.info('Feature flag updated', {
      provider: 'FeatureFlagsAPI',
      featureKey,
      updates,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Feature flag "${featureKey}" updated successfully`,
        flag: featureFlagManager.getFlag(featureKey),
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error('Failed to update feature flag', error, {
      provider: 'FeatureFlagsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to update feature flag',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/feature-flags
 * Clear feature flag overrides (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Add admin authentication check

    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('featureKey');

    if (featureKey) {
      // Clear specific override
      featureFlagManager.clearOverride(featureKey);

      logger.info('Feature flag override cleared', {
        provider: 'FeatureFlagsAPI',
        featureKey,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Override cleared for "${featureKey}"`,
        },
        { status: 200 }
      );
    } else {
      // Clear all overrides
      featureFlagManager.clearAllOverrides();

      logger.info('All feature flag overrides cleared', {
        provider: 'FeatureFlagsAPI',
      });

      return NextResponse.json(
        {
          success: true,
          message: 'All overrides cleared',
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    logger.error('Failed to clear feature flag overrides', error, {
      provider: 'FeatureFlagsAPI',
    });

    return NextResponse.json(
      {
        error: 'Failed to clear overrides',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
