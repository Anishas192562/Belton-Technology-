// Hero Carousel with Dots
document.addEventListener("DOMContentLoaded", function () {
  const carousel = document.querySelector(".building-hero-carousel");
  const track = document.querySelector(".carousel-track");
  const slides = document.querySelectorAll(".carousel-track img");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (!carousel || !track || slides.length === 0 || !prevBtn || !nextBtn) {
    return;
  }

  let currentSlide = 0;
  const totalSlides = slides.length;
  let autoSlide;

  // Create dots container automatically
  const dotsContainer = document.createElement("div");
  dotsContainer.className = "carousel-dots";
  carousel.appendChild(dotsContainer);

  // Create one dot for each slide
  slides.forEach(function (_, index) {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.setAttribute("aria-label", "Go to slide " + (index + 1));

    if (index === 0) {
      dot.classList.add("active");
    }

    dot.addEventListener("click", function () {
      stopAutoSlide();
      showSlide(index);
      startAutoSlide();
    });

    dotsContainer.appendChild(dot);
  });

  const dots = document.querySelectorAll(".carousel-dot");

  function showSlide(index) {
    if (index >= totalSlides) {
      currentSlide = 0;
    } else if (index < 0) {
      currentSlide = totalSlides - 1;
    } else {
      currentSlide = index;
    }

    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    // Update active dot
    dots.forEach(function (dot) {
      dot.classList.remove("active");
    });

    dots[currentSlide].classList.add("active");
  }

  function startAutoSlide() {
    stopAutoSlide();

    autoSlide = setInterval(function () {
      showSlide(currentSlide + 1);
    }, 4000);
  }

  function stopAutoSlide() {
    clearInterval(autoSlide);
  }

  nextBtn.addEventListener("click", function () {
    stopAutoSlide();
    showSlide(currentSlide + 1);
    startAutoSlide();
  });

  prevBtn.addEventListener("click", function () {
    stopAutoSlide();
    showSlide(currentSlide - 1);
    startAutoSlide();
  });

  carousel.addEventListener("mouseenter", function () {
    stopAutoSlide();
  });

  carousel.addEventListener("mouseleave", function () {
    startAutoSlide();
  });

  startAutoSlide();
});



  // Back to Top Button
document.addEventListener("DOMContentLoaded", function () {
  const backToTopBtn = document.createElement("button");
  backToTopBtn.innerHTML = "↑";
  backToTopBtn.className = "back-to-top";
  backToTopBtn.setAttribute("aria-label", "Back to top");

  document.body.appendChild(backToTopBtn);

  window.addEventListener("scroll", function () {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add("show");
    } else {
      backToTopBtn.classList.remove("show");
    }
  });

  backToTopBtn.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
});




// Image Zoom Popup
document.addEventListener("DOMContentLoaded", function () {
  const images = document.querySelectorAll("img");

  if (images.length === 0) return;

  // Create popup container
  const popup = document.createElement("div");
  popup.className = "image-popup";

  popup.innerHTML = `
    <span class="image-popup-close">&times;</span>
    <img class="image-popup-img" src="" alt="Zoomed image">
    <p class="image-popup-caption"></p>
  `;

  document.body.appendChild(popup);

  const popupImg = popup.querySelector(".image-popup-img");
  const popupCaption = popup.querySelector(".image-popup-caption");
  const closeBtn = popup.querySelector(".image-popup-close");

  images.forEach(function (img) {
    img.classList.add("zoomable-image");

    img.addEventListener("click", function () {
      popup.classList.add("active");
      popupImg.src = img.src;
      popupImg.alt = img.alt || "Zoomed image";
      popupCaption.textContent = img.alt || "";
      document.body.style.overflow = "hidden";
    });
  });

  // Close when clicking X
  closeBtn.addEventListener("click", function () {
    closePopup();
  });

  // Close when clicking outside image
  popup.addEventListener("click", function (event) {
    if (event.target === popup) {
      closePopup();
    }
  });

  // Close with Escape key
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePopup();
    }
  });

  function closePopup() {
    popup.classList.remove("active");
    popupImg.src = "";
    document.body.style.overflow = "";
  }
});


// Scroll Reveal Animation
document.addEventListener("DOMContentLoaded", function () {
  const revealElements = document.querySelectorAll(
    "section, .building-card, .info-card, .gallery-card, .content-box, .layout-card, .image-card"
  );

  if (revealElements.length === 0) return;

  revealElements.forEach(function (element) {
    element.classList.add("reveal");
  });

  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("show-reveal");
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  revealElements.forEach(function (element) {
    revealObserver.observe(element);
  });
});



let currentFontSize = 16;

function increaseText() {
  if (currentFontSize < 22) {
    currentFontSize += 2;
    document.body.style.fontSize = currentFontSize + "px";
  }
}

function decreaseText() {
  if (currentFontSize > 12) {
    currentFontSize -= 2;
    document.body.style.fontSize = currentFontSize + "px";
  }
}


document.addEventListener("DOMContentLoaded", function () {
  const counters = document.querySelectorAll(".counter");

  counters.forEach(counter => {
    const target = Number(counter.getAttribute("data-target"));
    let count = 0;

    const speed = 80;
    const increment = target / speed;

    function updateCounter() {
      if (count < target) {
        count += increment;
        counter.innerText = Math.ceil(count).toLocaleString();
        requestAnimationFrame(updateCounter);
      } else {
        counter.innerText = target.toLocaleString();
      }
    }

    updateCounter();
  });
});

const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileNav = document.getElementById("mobileNav");

if (hamburgerBtn && mobileNav) {
  hamburgerBtn.addEventListener("click", function () {
    mobileNav.classList.toggle("show-menu");

    if (mobileNav.classList.contains("show-menu")) {
      hamburgerBtn.innerHTML = "×";
      hamburgerBtn.setAttribute("aria-label", "Close menu");
    } else {
      hamburgerBtn.innerHTML = "☰";
      hamburgerBtn.setAttribute("aria-label", "Open menu");
    }
  });
}