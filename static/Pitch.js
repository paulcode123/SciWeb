//Start playing the video when the user scrolls to it
let observer = new IntersectionObserver((entries, observer) => { 
    console.log("observer")
    entries.forEach(entry => {
        console.log("entry")
        // Check if the video is in the viewport
        if (entry.isIntersecting) {
            console.log("playing")
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
    var startDimAt = 100; // Start dimming after 100px of scrolling
    var fullyDimmedAt = 500; // Fully dimmed at 500px of scrolling
  
    var opacity = 1;
    if (scrollY > startDimAt) {
        opacity = 1 - Math.min((scrollY - startDimAt) / (fullyDimmedAt - startDimAt), 1);
    }
  
    image.style.opacity = opacity;
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



//Type out mission text when user scrolls to it
      function typeWriter(element, text, i, interval) {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            console.log(text.charAt(i))
            i++;
            setTimeout(() => typeWriter(element, text, i, interval), interval);
        }
    }

    // Intersection Observer to trigger the typing effect
    let observer2 = new IntersectionObserver((entries, observer) => {
        console.log("observer2")
        entries.forEach(entry => {
            console.log("entry2")
            if (entry.isIntersecting) {
                console.log("typing")
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
    }, 7000); // 2000 milliseconds = 2 seconds