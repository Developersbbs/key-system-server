const cron = require('node-cron');
const Meeting = require('../models/Meeting');
const MeetingLog = require('../models/MeetingLog');
const User = require('../models/User');
const zoomService = require('../services/zoomService');

/**
 * Auto-Sync Attendance Job
 * Runs every 5 minutes.
 * Finds Zoom meetings that ended recently and syncs their attendance from Zoom API.
 */
const startAutoSyncJob = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('[AutoSync] Checking for ended Zoom meetings...');

        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Find Zoom meetings that ended in the last 24 hours (meetingEndTime is in the past)
            // or meetings that started more than 1 hour ago and have no end time set
            const meetingsToSync = await Meeting.find({
                meetingType: 'zoom',
                zoomMeetingId: { $exists: true, $ne: null },
                $or: [
                    // Has an end time that has passed
                    { meetingEndTime: { $gte: oneDayAgo, $lte: now } },
                    // Or started more than 1 hour ago (likely ended) and no end time
                    {
                        meetingEndTime: { $exists: false },
                        meetingDate: { $gte: oneDayAgo, $lte: new Date(now.getTime() - 60 * 60 * 1000) }
                    }
                ],
                // Only sync if not already synced recently (check if any logs have zoomDuration set)
            });

            if (meetingsToSync.length === 0) {
                console.log('[AutoSync] No meetings to sync.');
                return;
            }

            console.log(`[AutoSync] Found ${meetingsToSync.length} meeting(s) to check.`);

            for (const meeting of meetingsToSync) {
                try {
                    // Check if already synced (has logs with zoomDuration > 0)
                    const existingSyncedLog = await MeetingLog.findOne({
                        meetingId: meeting._id,
                        zoomDuration: { $gt: 0 }
                    });

                    if (existingSyncedLog) {
                        // Already synced, skip
                        continue;
                    }

                    // Fetch participant report from Zoom
                    const report = await zoomService.getMeetingParticipantsReport(meeting.zoomMeetingId);

                    if (!report || !report.participants || report.participants.length === 0) {
                        // Report not ready yet (meeting might still be ongoing)
                        continue;
                    }

                    console.log(`[AutoSync] Syncing "${meeting.title}" - ${report.participants.length} participants.`);

                    let updatedCount = 0;
                    for (const p of report.participants) {
                        if (!p.user_email) continue;

                        const user = await User.findOne({ email: p.user_email });
                        if (!user) continue;

                        const durationMinutes = Math.round(p.duration / 60);

                        await MeetingLog.findOneAndUpdate(
                            { meetingId: meeting._id, userId: user._id },
                            {
                                $set: {
                                    userName: user.name,
                                    // For Zoom-only mode: use Zoom data as the primary source
                                    duration: durationMinutes,
                                    joinedAt: new Date(p.join_time),
                                    leftAt: p.leave_time ? new Date(p.leave_time) : undefined,
                                    zoomDuration: durationMinutes,
                                    zoomJoinedAt: new Date(p.join_time),
                                    zoomLeftAt: p.leave_time ? new Date(p.leave_time) : undefined,
                                }
                            },
                            { upsert: true, new: true }
                        );
                        updatedCount++;
                    }

                    console.log(`[AutoSync] ✅ Synced ${updatedCount} participants for "${meeting.title}".`);

                } catch (err) {
                    // Zoom report not available yet (meeting still ongoing) - silent skip
                    if (err.response?.status === 404 || err.response?.data?.code === 3001) {
                        console.log(`[AutoSync] Report not ready for "${meeting.title}" - will retry.`);
                    } else {
                        console.error(`[AutoSync] Error syncing "${meeting.title}":`, err.message);
                    }
                }
            }

        } catch (err) {
            console.error('[AutoSync] Job error:', err.message);
        }
    });

    console.log('[AutoSync] Auto-sync attendance job started (every 5 minutes).');
};

module.exports = { startAutoSyncJob };
