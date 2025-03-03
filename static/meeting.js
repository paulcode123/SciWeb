document.addEventListener('DOMContentLoaded', function() {
    let api = null;
    let currentNotes = '';
    let participants = [];

    // Initialize UI elements
    initializeTabs();
    initializeScheduling();

    // Handle Start/Join Meeting
    document.getElementById('startMeeting').addEventListener('click', function() {
        if (!api) {
            startMeeting();
        }
    });

    function startMeeting() {
        const domain = 'meet.jit.si';
        const options = {
            roomName: 'SciWeb_' + Math.random().toString(36).substring(7),
            width: '100%',
            height: '100%',
            parentNode: document.querySelector('#meet'),
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
            },
            configOverwrite: {
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                enableWelcomePage: false,
                enableClosePage: false,
            }
        };

        api = new JitsiMeetExternalAPI(domain, options);

        // Handle API events
        api.addEventListeners({
            participantJoined: handleParticipantJoined,
            participantLeft: handleParticipantLeft,
            videoConferenceJoined: handleVideoConferenceJoined,
            videoConferenceLeft: handleVideoConferenceLeft
        });

        // Update room name
        document.getElementById('roomName').textContent = options.roomName;
    }

    // Meeting Event Handlers
    function handleParticipantJoined(participant) {
        participants.push(participant);
        updateParticipantCount();
        updateParticipantsList();
    }

    function handleParticipantLeft(participant) {
        participants = participants.filter(p => p.id !== participant.id);
        updateParticipantCount();
        updateParticipantsList();
    }

    function handleVideoConferenceJoined(participant) {
        document.querySelector('.video-container').classList.add('active');
    }

    function handleVideoConferenceLeft() {
        if (api) {
            api.dispose();
            api = null;
        }
        document.querySelector('.video-container').classList.remove('active');
        participants = [];
        updateParticipantCount();
        updateParticipantsList();
    }

    // UI Updates
    function updateParticipantCount() {
        document.getElementById('participantCount').textContent = 
            `${participants.length} participant${participants.length !== 1 ? 's' : ''}`;
    }

    function updateParticipantsList() {
        const list = document.querySelector('.participants-list');
        list.innerHTML = participants.map(p => `
            <div class="participant-item">
                <i class="fas fa-user"></i>
                <span>${p.displayName || 'Anonymous'}</span>
            </div>
        `).join('');
    }

    // Tab Handling
    function initializeTabs() {
        document.querySelectorAll('.tab-btn').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active tab button
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                // Show active tab content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabName}-panel`).classList.add('active');
            });
        });
    }

    // Notes Handling
    const notesEditor = document.querySelector('.notes-editor');
    
    notesEditor.addEventListener('input', () => {
        currentNotes = notesEditor.innerHTML;
    });

    document.getElementById('saveNotes').addEventListener('click', async () => {
        try {
            await fetchRequest('/post_data', {
                sheet: 'Notes',
                data: {
                    content: currentNotes,
                    meetingId: document.getElementById('roomName').textContent,
                    timestamp: new Date().toISOString()
                }
            });
            alert('Notes saved successfully!');
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Failed to save notes. Please try again.');
        }
    });

    // Meeting Scheduling
    function initializeScheduling() {
        const scheduleBtn = document.getElementById('scheduleMeeting');
        const modal = document.getElementById('scheduleModal');
        const cancelBtn = document.getElementById('cancelSchedule');
        const scheduleForm = document.getElementById('scheduleForm');

        scheduleBtn.addEventListener('click', () => {
            modal.classList.add('active');
            loadParticipantOptions();
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        scheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const meetingData = {
                title: document.getElementById('meetingTitle').value,
                date: document.getElementById('meetingDate').value,
                time: document.getElementById('meetingTime').value,
                duration: document.getElementById('meetingDuration').value,
                participants: Array.from(document.getElementById('meetingParticipants').selectedOptions)
                    .map(option => option.value)
            };

            try {
                await fetchRequest('/post_data', {
                    sheet: 'Meetings',
                    data: meetingData
                });

                // Send notifications to participants
                await fetchRequest('/send_notification', {
                    OSIS: meetingData.participants,
                    title: 'New Meeting Scheduled',
                    body: `You have been invited to: ${meetingData.title}`,
                    url: '/Schedule'
                });

                alert('Meeting scheduled successfully!');
                modal.classList.remove('active');
                scheduleForm.reset();
            } catch (error) {
                console.error('Error scheduling meeting:', error);
                alert('Failed to schedule meeting. Please try again.');
            }
        });
    }

    async function loadParticipantOptions() {
        try {
            const data = await fetchRequest('/data', { data: 'Classes' });
            const select = document.getElementById('meetingParticipants');
            select.innerHTML = '';

            if (data.Classes) {
                data.Classes.forEach(classData => {
                    if (classData.OSIS) {
                        const option = document.createElement('option');
                        option.value = classData.OSIS;
                        option.textContent = `${classData.name} - ${classData.OSIS}`;
                        select.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading participants:', error);
        }
    }

    // Meeting Controls
    document.getElementById('toggleAudio').addEventListener('click', () => {
        if (api) api.executeCommand('toggleAudio');
    });

    document.getElementById('toggleVideo').addEventListener('click', () => {
        if (api) api.executeCommand('toggleVideo');
    });

    document.getElementById('toggleScreen').addEventListener('click', () => {
        if (api) api.executeCommand('toggleShareScreen');
    });

    document.getElementById('toggleChat').addEventListener('click', () => {
        if (api) api.executeCommand('toggleChat');
    });

    document.getElementById('toggleWhiteboard').addEventListener('click', () => {
        if (api) api.executeCommand('toggleWhiteboard');
    });

    document.getElementById('endCall').addEventListener('click', () => {
        if (api) {
            api.executeCommand('hangup');
            handleVideoConferenceLeft();
        }
    });
}); 