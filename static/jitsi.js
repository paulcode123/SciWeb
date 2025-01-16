let jitsiApi = null;
const domain = 'meet.jit.si';

async function main() {
  // Add participant counter element to HTML
  const startMeetingBtn = document.getElementById('startMeeting');
  if (startMeetingBtn) {
    const participantCount = document.createElement('span');
    participantCount.id = 'participantCount';
    participantCount.style.marginLeft = '10px';
    startMeetingBtn.parentNode.insertBefore(participantCount, startMeetingBtn.nextSibling);

    var identifier = await getIdentifier();
    console.log(identifier);
    
    startMeetingBtn.addEventListener('click', () => initializeJitsiMeet(identifier));
    // Check participants periodically
    // checkParticipants(identifier);
    // setInterval(() => checkParticipants(identifier), 10000); // Update every 10 seconds
  }
}

main();

async function getIdentifier() {
  return new Promise((resolve) => {
    const checkData = () => {
      const identifier = 
        (typeof classData !== 'undefined' && `${classData?.name} ${classData?.id}`) || 
        (typeof assignment !== 'undefined' && `${assignment?.name} ${assignment?.id}`);
      
      if (identifier && !identifier.includes('undefined')) {
        resolve(identifier);
      } else {
        setTimeout(checkData, 100); // Check again in 100ms
      }
    };
    
    checkData();
  });
}

function checkParticipants(identifier) {
  
  console.log(identifier);
  fetch(`/check-meeting/${encodeURIComponent(identifier)}`, {
    method: 'GET'
  })
    .then(response => response.json())
    .then(data => {
      const count = data?.participants?.length || 0;
      console.log('Room check:', identifier, data);
      document.getElementById('participantCount').textContent = 
        `${count} ${count === 1 ? 'person' : 'people'} in meeting`;
    })
    .catch(() => {
      document.getElementById('participantCount').textContent = 'No active meeting';
    });
}

// Add these new functions
function initializeJitsiMeet(identifier) {
  if (typeof JitsiMeetExternalAPI === 'undefined') {
    console.error('Jitsi Meet API not loaded');
    return;
  }

  const meetDiv = document.getElementById('meet');
  meetDiv.classList.add('active');

  if (jitsiApi) {
    jitsiApi.dispose();
  }

  

  const options = {
    roomName: identifier,
    width: '100%',
    height: '400px',
    parentNode: meetDiv,
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'desktop',
        'hangup', 'chat'
      ],
      SETTINGS_SECTIONS: ['devices'],
      TOOLBAR_ALWAYS_VISIBLE: true,
      SHOW_CHROME_EXTENSION_BANNER: false  // Add this line
    }
  };

  try {
    jitsiApi = new JitsiMeetExternalAPI(domain, options);
  } catch (error) {
    console.error('Failed to initialize Jitsi:', error);
    meetDiv.classList.remove('active');
  }
}
