const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');

// Helper to get Access Token
const getZoomAccessToken = async () => {
    try {
        const config = await SystemConfig.getConfig();
        const { zoomAccountId, zoomClientId, zoomClientSecret } = config;

        // Masked logging to check for swapped keys
        const showFirst4 = (str) => str ? str.substring(0, 4) + '...' : 'MISSING';
        console.log(`Zoom Debug - AccountID: ${showFirst4(zoomAccountId)} (Length: ${zoomAccountId?.length})`);
        console.log(`Zoom Debug - ClientID: ${showFirst4(zoomClientId)} (Length: ${zoomClientId?.length})`);

        if (!zoomAccountId || !zoomClientId || !zoomClientSecret) {
            throw new Error('Zoom credentials not configured in System Settings.');
        }

        const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${zoomAccountId.trim()}`;
        const authHeader = Buffer.from(`${zoomClientId.trim()}:${zoomClientSecret.trim()}`).toString('base64');

        const response = await axios.post(tokenUrl, null, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching Zoom access token:', JSON.stringify(error.response?.data || error.message, null, 2));
        throw new Error(`Zoom Auth Error: ${JSON.stringify(error.response?.data?.reason || error.message)}`);
    }
};

// Helper to list users
const listZoomUsers = async (accessToken) => {
    try {
        const response = await axios.get('https://api.zoom.us/v2/users?status=active&page_size=30', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.users.map(u => u.email);
    } catch (error) {
        console.error("Failed to list zoom users:", error.message);
        return [];
    }
};

// Get Meeting Participants Report (For Duration)
exports.getMeetingParticipantsReport = async (meetingId) => {
    try {
        const accessToken = await getZoomAccessToken();
        // Use the 'past_meetings/{meetingId}/participants' endpoint
        // Note: meetingId can be the long UUID or the short number.
        const response = await axios.get(`https://api.zoom.us/v2/report/meetings/${meetingId}/participants?page_size=300`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching meeting report:', JSON.stringify(error.response?.data || error.message, null, 2));
        // Return empty list if report not ready (e.g. meeting not ended or too recent)
        return { participants: [] };
    }
};

// Create Zoom Meeting
exports.createZoomMeeting = async (topic, startTime, duration, hostEmail) => {
    try {
        const accessToken = await getZoomAccessToken();
        const userId = hostEmail || 'me';

        const meetingData = {
            topic: topic || 'New Meeting',
            type: 2, // Scheduled meeting
            start_time: startTime ? new Date(startTime).toISOString() : undefined,
            duration: duration || 60,
            settings: {
                host_video: true,
                participant_video: false,
                join_before_host: true,
                mute_upon_entry: true,
                waiting_room: false,
                auto_recording: 'cloud' // Optional: auto record
            }
        };

        const response = await axios.post(`https://api.zoom.us/v2/users/${userId}/meetings`, meetingData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        const errorData = error.response?.data;
        console.error('Error creating Zoom meeting:', JSON.stringify(errorData || error.message, null, 2));

        // If user not found (Error 1001), try to list helpful alternatives
        if (errorData?.code === 1001) {
            try {
                const token = await getZoomAccessToken();
                const users = await listZoomUsers(token);
                console.log("\n---------------------------------------------------");
                console.log("⚠️  ZOOM USER MISMATCH DETECTED");
                console.log(`❌ The email '${hostEmail}' was not found in your Zoom account.`);
                console.log("✅ AVAILABLE ZOOM USERS:");
                users.forEach(email => console.log(`   - ${email}`));
                console.log("---------------------------------------------------\n");
            } catch (e) {
                console.error("Could not list alternative users.", e);
            }
        }

        throw new Error(`Zoom API Error: ${JSON.stringify(errorData?.message || error.message)}`);
    }
};
