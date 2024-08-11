//Start playing the video when the user scrolls to it
let observer = new IntersectionObserver((entries, observer) => { 
    
    entries.forEach(entry => {
        
        // Check if the video is in the viewport
        if (entry.isIntersecting) {
            
            // Start playing the video
            entry.target.play();
        } else {
            // Optional: Pause the video if it's out of view
            entry.target.pause();
        }
    });
}, { threshold: 0.5 }); // Trigger when at least 50% of the video is visible

// Target the video element to observe
observer.observe(document.getElementById('swbVid'));

 // Dim the cover image as the user scrolls past it
 window.addEventListener('scroll', function() {
    var image = document.getElementById('dimImage');
    var windowHeight = window.innerHeight;
    
    var scrollY = window.scrollY;
  
    // Adjust these values as needed
    var startDimAt = 0; // Start dimming after 100px of scrolling
    var fullyDimmedAt = 300; // Fully dimmed at 500px of scrolling
  
    var opacity = 1;
    if (scrollY > startDimAt) {
        opacity = 1 - Math.min((scrollY - startDimAt) / (fullyDimmedAt - startDimAt), 1);
    }
  
    image.style.opacity = opacity;

    var imageb = document.getElementById('Toc');
    const startScrollPosition = 700; // The scroll position where opacity should start changing
    const endScrollPosition = 800; // The scroll position where opacity should be fully 1

    opacity = 1;

  if (scrollY < startScrollPosition) {
    // Calculate how far outside the range we are, to scale opacity to 0 when the image wouldn't be on the screen
    let distance = startScrollPosition - scrollY;
    
    opacity = Math.max(0, 1 - (distance / windowHeight));
  } else if (scrollY > endScrollPosition) {
    // Similar calculation for when scrolling past the end position
    let distance = scrollY - endScrollPosition;
    
    opacity = Math.max(0, 1 - (distance / windowHeight));
  } // When in between, opacity remains 1, as initialized
  
  imageb.style.opacity = opacity;
  const buttons = document.querySelectorAll('main button');

// add event listener to button with id="GetStarted" to link to "/GetStart" page when clicked
document.getElementById('GetStarted').addEventListener('click', function() {
    window.location.href = "/GetStart";
});


// Iterate over all buttons and set their opacity
buttons.forEach(button => {
    button.style.opacity = opacity;
});
  });

  //When the buttons in the table of contents are clicked, scroll to their respective sections

  document.getElementById('b1').addEventListener('click', function() {
    document.getElementById('msn').scrollIntoView({
        behavior: 'smooth'
    });
});

  document.getElementById('b2').addEventListener('click', function() {
          document.getElementById('abt').scrollIntoView({
              behavior: 'smooth'
          });
      });
      document.getElementById('b3').addEventListener('click', function() {
        document.getElementById('join').scrollIntoView({
            behavior: 'smooth'
        });
    });
    document.getElementById('b4').addEventListener('click', function() {
        document.getElementById('res').scrollIntoView({
            behavior: 'smooth'
        });
    });
    document.getElementById('b5').addEventListener('click', function() {
        document.getElementById('team').scrollIntoView({
            behavior: 'smooth'
        });
    });



//Type out mission text when user scrolls to it
      function typeWriter(element, text, i, interval) {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            
            i++;
            setTimeout(() => typeWriter(element, text, i, interval), interval);
        }
    }

    // Intersection Observer to trigger the typing effect
    let observer2 = new IntersectionObserver((entries, observer) => {
        
        entries.forEach(entry => {
            
            if (entry.isIntersecting) {
                
                typeWriter(typingText, txt2type, 0, 50);
                observer2.unobserve(entry.target); // Stop observing after it's visible
            }
        });
    });

    // Target the text element to observe
    let typingText = document.getElementById('msnText');
    
    
    txt2type = "To build a platform where BxSci students can collaborate and feel in control over their academic endeavors."
    setTimeout(function() {
        
      
        document.getElementById('prez').style.visibility = 'visible';
        window.scrollTo(0, 0);
        observer2.observe(typingText);
        document.getElementById('loadingWheel').style.display = "none";
    }, 2000); // 2000 milliseconds = 2 seconds