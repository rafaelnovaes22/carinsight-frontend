// CarInsight Premium Interactions

document.addEventListener('DOMContentLoaded', () => {
    // 1. Reveal Elements on Scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Elements to animate
    const animateElements = document.querySelectorAll('.category-card, .car-card, .step-card, .section-title, .hero h1, .hero p, .hero-actions');

    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
    });

    // 2. Smooth Scroll for Nav Links & Sidebar Menu Toggle
    const sidebarMenu = document.getElementById('sidebar-menu');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');

    // Open sidebar
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebarMenu.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });
    }

    // Close sidebar
    function closeSidebar() {
        sidebarMenu.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (menuClose) {
        menuClose.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Smooth scroll for sidebar links (ONLY for internal anchors)
    document.querySelectorAll('.sidebar-links a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            // If it's a page link (not starting with #), allow default navigation
            if (!targetId || !targetId.startsWith('#')) return;

            e.preventDefault();
            closeSidebar();

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. Header background change on scroll
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = '#ffffff';
            header.style.border = '1px solid rgba(0, 0, 0, 0.05)';
        } else {
            header.style.background = '#ffffff';
            header.style.border = '1px solid var(--glass-border)';
        }
    });

    // 4. Parallax effect for hero car image
    const heroImage = document.querySelector('.hero-image-container img');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        if (heroImage) {
            heroImage.style.transform = `scale(1.02) translateY(${scrolled * 0.1}px)`;
        }
    });

    // 5. Multi-Instance Car Slider Logic
    function initSliders() {
        const sliderContainers = document.querySelectorAll('.slider-container');

        sliderContainers.forEach(container => {
            const track = container.querySelector('.slider-track');
            const prevBtn = container.querySelector('.prev-btn');
            const nextBtn = container.querySelector('.next-btn');
            const dotsContainer = container.querySelector('.slider-dots');
            const cards = container.querySelectorAll('.car-card');

            if (!track || cards.length === 0) return;

            let currentIndex = 0;
            let autoPlayInterval;

            const getVisibleCards = () => {
                if (window.innerWidth <= 600) return 1.2; // Show partial next card
                if (window.innerWidth <= 900) return 2;
                return 3;
            };

            // Create dots
            if (dotsContainer) {
                dotsContainer.innerHTML = ''; // Clear existing
                const visibleCount = getVisibleCards();
                const dotCount = Math.max(0, cards.length - Math.floor(visibleCount) + 1);

                for (let i = 0; i < dotCount; i++) {
                    const dot = document.createElement('div');
                    dot.classList.add('dot');
                    if (i === 0) dot.classList.add('active');
                    dot.addEventListener('click', () => goToSlide(i));
                    dotsContainer.appendChild(dot);
                }
            }

            function updateSlider() {
                const visible = getVisibleCards();
                const maxIndex = cards.length - Math.floor(visible);
                if (currentIndex > maxIndex) currentIndex = maxIndex;
                if (currentIndex < 0) currentIndex = 0;

                const gap = 24;
                const cardWidth = cards[0].offsetWidth;
                const offset = currentIndex * (cardWidth + gap);

                track.style.transform = `translateX(-${offset}px)`;

                const dots = container.querySelectorAll('.dot');
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });

                // Update button states
                if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.5' : '1';
                if (nextBtn) nextBtn.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
            }

            function nextSlide() {
                const visible = getVisibleCards();
                const maxIndex = cards.length - Math.floor(visible);
                if (currentIndex >= maxIndex) {
                    currentIndex = 0;
                } else {
                    currentIndex++;
                }
                updateSlider();
            }

            function prevSlide() {
                const visible = getVisibleCards();
                const maxIndex = cards.length - Math.floor(visible);
                if (currentIndex === 0) {
                    currentIndex = maxIndex;
                } else {
                    currentIndex--;
                }
                updateSlider();
            }

            function goToSlide(index) {
                currentIndex = index;
                updateSlider();
                resetAutoplay();
            }

            function startAutoplay() {
                autoPlayInterval = setInterval(nextSlide, 5000);
            }

            function resetAutoplay() {
                clearInterval(autoPlayInterval);
                startAutoplay();
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    nextSlide();
                    resetAutoplay();
                });
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    prevSlide();
                    resetAutoplay();
                });
            }

            // Pause autoplay on hover
            track.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
            track.addEventListener('mouseleave', () => startAutoplay());

            startAutoplay();
            window.addEventListener('resize', updateSlider);

            // Initial setup
            setTimeout(updateSlider, 100);
        });
    }

    initSliders();
    // 6. Typing Effect Animation
    const rotatingText = document.getElementById('rotating-text');
    const texts = [
        'clio sedan em são paulo',
        'Gol 2000 em promoção',
        'Civic conservado',
        'SUV híbrido para família',
        'Corolla com baixa km',
        'Fiat Uno escada no teto'
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        if (!rotatingText) return;

        const currentText = texts[textIndex];

        if (isDeleting) {
            rotatingText.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            rotatingText.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typingSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typingSpeed = 500;
        }

        setTimeout(type, typingSpeed);
    }

    if (rotatingText) {
        type();
    }
    // 7. Filter Buttons Toggle & Tooltip Rotation
    const filterButtons = document.querySelectorAll('.filter-btn');
    let activeTooltipIndex = 0;
    let tooltipInterval;

    function rotateTooltip() {
        filterButtons.forEach(btn => btn.classList.remove('active-tooltip'));
        filterButtons[activeTooltipIndex].classList.add('active-tooltip');
        activeTooltipIndex = (activeTooltipIndex + 1) % filterButtons.length;
    }

    function startTooltipRotation() {
        tooltipInterval = setInterval(rotateTooltip, 1000);
    }

    function stopTooltipRotation() {
        clearInterval(tooltipInterval);
        filterButtons.forEach(btn => btn.classList.remove('active-tooltip'));
    }

    if (filterButtons.length > 0) {
        startTooltipRotation();

        const filterContainer = document.querySelector('.filter-buttons');
        if (filterContainer) {
            filterContainer.addEventListener('mouseenter', stopTooltipRotation);
            filterContainer.addEventListener('mouseleave', startTooltipRotation);
        }

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });
    }

    // 8. Location Modal
    const locationModal = document.getElementById('location-modal');
    const locationModalOverlay = document.getElementById('location-modal-overlay');
    const locationClose = document.getElementById('location-close');
    const locationBtn = document.querySelector('.filter-btn[data-tooltip="Localização"]');
    const searchStateInput = document.getElementById('search-state');
    const stateItems = document.querySelectorAll('.state-item');

    // Open location modal
    if (locationBtn) {
        locationBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent filter button toggle
            locationModal.classList.add('active');
            locationModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Focus on search input
            setTimeout(() => searchStateInput?.focus(), 300);
        });
    }

    // Close location modal
    function closeLocationModal() {
        locationModal.classList.remove('active');
        locationModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Clear search
        if (searchStateInput) searchStateInput.value = '';
        stateItems.forEach(item => item.classList.remove('hidden'));
    }

    if (locationClose) {
        locationClose.addEventListener('click', closeLocationModal);
    }

    if (locationModalOverlay) {
        locationModalOverlay.addEventListener('click', closeLocationModal);
    }

    // Search states
    if (searchStateInput) {
        searchStateInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();

            stateItems.forEach(item => {
                const stateName = item.textContent.toLowerCase();
                const stateCode = item.getAttribute('data-state').toLowerCase();

                if (stateName.includes(searchTerm) || stateCode.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }

    // Select state
    stateItems.forEach(item => {
        item.addEventListener('click', () => {
            const stateName = item.textContent;
            const stateCode = item.getAttribute('data-state');

            // Remove previous selection
            stateItems.forEach(i => i.classList.remove('selected'));

            // Mark as selected
            item.classList.add('selected');

            // Update location button to show selected state
            if (locationBtn) {
                const tooltip = locationBtn.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = stateCode;
                }
                locationBtn.classList.add('active');
            }

            // Close modal after short delay
            setTimeout(() => {
                closeLocationModal();
            }, 300);

            console.log('Estado selecionado:', stateName, stateCode);
        });
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && locationModal.classList.contains('active')) {
            closeLocationModal();
        }
    });

    // 9. Year Modal
    const yearModal = document.getElementById('year-modal');
    const yearModalOverlay = document.getElementById('year-modal-overlay');
    const yearClose = document.getElementById('year-close');
    const yearBtn = document.querySelector('.filter-btn[data-tooltip="Ano"]');
    const yearSlider = document.getElementById('year-slider');
    const yearValue = document.getElementById('year-value');
    const yearSliderFill = document.getElementById('year-slider-fill');
    const yearPrevBtn = document.getElementById('year-prev');
    const yearNextBtn = document.getElementById('year-next');
    const yearConfirmBtn = document.getElementById('year-confirm');
    const yearQuickBtns = document.querySelectorAll('.year-quick-btn');

    let currentYear = 2020;
    const minYear = 1980;
    const maxYear = 2026;

    // Update year display and slider fill
    function updateYearDisplay(year) {
        currentYear = parseInt(year);
        yearValue.textContent = currentYear;
        yearSlider.value = currentYear;

        // Update fill width
        const percentage = ((currentYear - minYear) / (maxYear - minYear)) * 100;
        yearSliderFill.style.width = `${percentage}%`;

        // Update quick select buttons
        yearQuickBtns.forEach(btn => {
            const btnYear = parseInt(btn.getAttribute('data-year'));
            btn.classList.toggle('active', btnYear === currentYear);
        });
    }

    // Open year modal
    if (yearBtn) {
        yearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            yearModal.classList.add('active');
            yearModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateYearDisplay(currentYear);
        });
    }

    // Close year modal
    function closeYearModal() {
        yearModal.classList.remove('active');
        yearModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (yearClose) {
        yearClose.addEventListener('click', closeYearModal);
    }

    if (yearModalOverlay) {
        yearModalOverlay.addEventListener('click', closeYearModal);
    }

    // Slider input
    if (yearSlider) {
        yearSlider.addEventListener('input', (e) => {
            updateYearDisplay(e.target.value);
        });
    }

    // Previous year button
    if (yearPrevBtn) {
        yearPrevBtn.addEventListener('click', () => {
            if (currentYear > minYear) {
                updateYearDisplay(currentYear - 1);
            }
        });
    }

    // Next year button
    if (yearNextBtn) {
        yearNextBtn.addEventListener('click', () => {
            if (currentYear < maxYear) {
                updateYearDisplay(currentYear + 1);
            }
        });
    }

    // Quick select buttons
    yearQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const year = parseInt(btn.getAttribute('data-year'));
            updateYearDisplay(year);
        });
    });

    // Confirm button
    if (yearConfirmBtn) {
        yearConfirmBtn.addEventListener('click', () => {
            // Update year button to show selected year
            if (yearBtn) {
                const tooltip = yearBtn.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = currentYear.toString();
                }
                yearBtn.classList.add('active');
            }

            console.log('Ano selecionado:', currentYear);
            closeYearModal();
        });
    }

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && yearModal.classList.contains('active')) {
            closeYearModal();
        }
    });

    // Keyboard navigation (arrow keys)
    document.addEventListener('keydown', (e) => {
        if (yearModal.classList.contains('active')) {
            if (e.key === 'ArrowLeft' && currentYear > minYear) {
                updateYearDisplay(currentYear - 1);
            } else if (e.key === 'ArrowRight' && currentYear < maxYear) {
                updateYearDisplay(currentYear + 1);
            }
        }
    });

    // 10. Price Modal
    const priceModal = document.getElementById('price-modal');
    const priceModalOverlay = document.getElementById('price-modal-overlay');
    const priceClose = document.getElementById('price-close');
    const priceBtn = document.querySelector('.filter-btn[data-tooltip="Preço"]');
    const priceSlider = document.getElementById('price-slider');
    const priceValue = document.getElementById('price-value');
    const priceSliderFill = document.getElementById('price-slider-fill');
    const pricePrevBtn = document.getElementById('price-prev');
    const priceNextBtn = document.getElementById('price-next');
    const priceConfirmBtn = document.getElementById('price-confirm');
    const priceQuickBtns = document.querySelectorAll('.price-quick-btn');

    let currentPrice = 80000;
    const minPrice = 20000;
    const maxPrice = 200000;
    const priceStep = 1000;

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    }

    // Update price display and slider fill
    function updatePriceDisplay(price) {
        currentPrice = parseInt(price);
        priceValue.textContent = formatCurrency(currentPrice);
        priceSlider.value = currentPrice;

        // Update fill width
        const percentage = ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100;
        priceSliderFill.style.width = `${percentage}%`;

        // Update quick select buttons
        priceQuickBtns.forEach(btn => {
            const btnPrice = parseInt(btn.getAttribute('data-price'));
            btn.classList.toggle('active', btnPrice === currentPrice);
        });
    }

    // Open price modal
    if (priceBtn) {
        priceBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            priceModal.classList.add('active');
            priceModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            updatePriceDisplay(currentPrice);
        });
    }

    // Close price modal
    function closePriceModal() {
        priceModal.classList.remove('active');
        priceModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (priceClose) {
        priceClose.addEventListener('click', closePriceModal);
    }

    if (priceModalOverlay) {
        priceModalOverlay.addEventListener('click', closePriceModal);
    }

    // Slider input
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            updatePriceDisplay(e.target.value);
        });
    }

    // Previous price button
    if (pricePrevBtn) {
        pricePrevBtn.addEventListener('click', () => {
            if (currentPrice > minPrice) {
                updatePriceDisplay(currentPrice - 5000); // Step of 5000 for buttons
            }
        });
    }

    // Next price button
    if (priceNextBtn) {
        priceNextBtn.addEventListener('click', () => {
            if (currentPrice < maxPrice) {
                updatePriceDisplay(currentPrice + 5000); // Step of 5000 for buttons
            }
        });
    }

    // Quick select buttons
    priceQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const price = parseInt(btn.getAttribute('data-price'));
            updatePriceDisplay(price);
        });
    });

    // Confirm button
    if (priceConfirmBtn) {
        priceConfirmBtn.addEventListener('click', () => {
            // Update price button to show selected price
            if (priceBtn) {
                const tooltip = priceBtn.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = `Até ${currentPrice / 1000}k`;
                }
                priceBtn.classList.add('active');
            }

            console.log('Preço selecionado:', currentPrice);
            closePriceModal();
        });
    }

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && priceModal.classList.contains('active')) {
            closePriceModal();
        }
    });

    // Keyboard navigation for price
    document.addEventListener('keydown', (e) => {
        if (priceModal.classList.contains('active')) {
            if (e.key === 'ArrowLeft' && currentPrice > minPrice) {
                updatePriceDisplay(currentPrice - 1000);
            } else if (e.key === 'ArrowRight' && currentPrice < maxPrice) {
                updatePriceDisplay(currentPrice + 1000);
            }
        }
    });

    // 11. Condition Modal
    const conditionModal = document.getElementById('condition-modal');
    const conditionModalOverlay = document.getElementById('condition-modal-overlay');
    const conditionClose = document.getElementById('condition-close');
    const conditionBtn = document.querySelector('.filter-btn[data-tooltip="0 km"]'); // Selector targeting the 0km button
    const conditionItems = document.querySelectorAll('.condition-item');

    // Open condition modal
    if (conditionBtn) {
        conditionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            conditionModal.classList.add('active');
            conditionModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    // Close condition modal
    function closeConditionModal() {
        conditionModal.classList.remove('active');
        conditionModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (conditionClose) {
        conditionClose.addEventListener('click', closeConditionModal);
    }

    if (conditionModalOverlay) {
        conditionModalOverlay.addEventListener('click', closeConditionModal);
    }

    // Select condition
    conditionItems.forEach(item => {
        item.addEventListener('click', () => {
            const value = item.getAttribute('data-value');
            const label = item.textContent.trim(); // Get text like "0 km" or "Seminovo / Usado"

            // Remove previous selection
            conditionItems.forEach(i => i.classList.remove('selected'));

            // Mark as selected
            item.classList.add('selected');

            // Update button to show selected condition
            if (conditionBtn) {
                const tooltip = conditionBtn.querySelector('.tooltip');
                // Optional: Change icon depending on selection
                const icon = conditionBtn.querySelector('i');

                if (value === '0km') {
                    if (tooltip) tooltip.textContent = '0 km';
                    if (icon) icon.setAttribute('data-lucide', 'sparkles');
                } else {
                    if (tooltip) tooltip.textContent = 'Seminovo';
                    if (icon) icon.setAttribute('data-lucide', 'car-front');
                }

                // Refresh icon cause we changed data-lucide
                lucide.createIcons();

                conditionBtn.classList.add('active');
            }

            // Close modal after short delay
            setTimeout(() => {
                closeConditionModal();
            }, 300);

            console.log('Condição selecionada:', label);
        });
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && conditionModal.classList.contains('active')) {
            closeConditionModal();
        }
    });

    // 12. Brand Modal
    const brandModal = document.getElementById('brand-modal');
    const brandModalOverlay = document.getElementById('brand-modal-overlay');
    const brandClose = document.getElementById('brand-close');
    const brandBtn = document.querySelector('.filter-btn[data-tooltip="Marca de Carro"]');
    const searchBrandInput = document.getElementById('search-brand');
    const brandItems = document.querySelectorAll('.brand-item');

    // Open brand modal
    if (brandBtn) {
        brandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            brandModal.classList.add('active');
            brandModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Focus on search input
            setTimeout(() => searchBrandInput?.focus(), 300);
        });
    }

    // Close brand modal
    function closeBrandModal() {
        brandModal.classList.remove('active');
        brandModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Clear search
        if (searchBrandInput) searchBrandInput.value = '';
        brandItems.forEach(item => item.classList.remove('hidden'));
    }

    if (brandClose) {
        brandClose.addEventListener('click', closeBrandModal);
    }

    if (brandModalOverlay) {
        brandModalOverlay.addEventListener('click', closeBrandModal);
    }

    // Search brands
    if (searchBrandInput) {
        searchBrandInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();

            brandItems.forEach(item => {
                const brandName = item.getAttribute('data-brand').toLowerCase();

                if (brandName.includes(searchTerm)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }

    // Select brand
    brandItems.forEach(item => {
        item.addEventListener('click', () => {
            const brand = item.getAttribute('data-brand');

            // Remove previous selection
            brandItems.forEach(i => i.classList.remove('selected'));

            // Mark as selected
            item.classList.add('selected');

            // Update button to show selected brand
            if (brandBtn) {
                const tooltip = brandBtn.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = brand;
                }
                brandBtn.classList.add('active');
            }

            // Close modal after short delay
            setTimeout(() => {
                closeBrandModal();
            }, 300);

            console.log('Marca selecionada:', brand);
        });
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && brandModal.classList.contains('active')) {
            closeBrandModal();
        }
    });

});
