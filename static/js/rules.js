document.addEventListener('DOMContentLoaded', function () {
    // Add smooth scrolling behavior for TOC links
    document.querySelectorAll('.toc a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            // Get the target section
            const targetSection = document.querySelector(this.getAttribute('href'));

            // Calculate the offset, considering the fixed navbar height
            const navbarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 0;

            window.scrollTo({
                top: targetSection.offsetTop - navbarHeight, // Adjusted scroll position
                behavior: 'smooth'
            });
        });
    });

    // Highlight the currently visible section in the TOC
    const tocLinks = document.querySelectorAll('.toc a');
    const sections = document.querySelectorAll('section');

    function onScroll() {
        let currentSection = null;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 30; // Adjusted for a small margin
            const sectionBottom = sectionTop + section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY <= sectionBottom) {
                currentSection = section.id;
            }
        });

        tocLinks.forEach(link => {
            if (link.getAttribute('href').substring(1) === currentSection) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    window.addEventListener('scroll', onScroll);
    onScroll(); // Run once on page load to highlight the active section
});

var toc = document.querySelector('.toc');
var tocPath = document.querySelector('.toc-marker path');
var tocItems;

// Factor of screen size that the element must cross before it's considered visible
var TOP_MARGIN = 0.1,
    BOTTOM_MARGIN = 0.2;

var pathLength;

var lastPathStart,
    lastPathEnd;

window.addEventListener('resize', drawPath, false);
window.addEventListener('scroll', sync, false);

drawPath();

function drawPath() {
    tocItems = [].slice.call(toc.querySelectorAll('li'));

    // Cache element references and measurements
    tocItems = tocItems.map(function (item) {
        var anchor = item.querySelector('a');
        var target = document.getElementById(anchor.getAttribute('href').slice(1));

        return {
            listItem: item,
            anchor: anchor,
            target: target
        };
    });

    // Remove missing targets
    tocItems = tocItems.filter(function (item) {
        return !!item.target;
    });

    var path = [];
    var pathIndent;

    tocItems.forEach(function (item, i) {
        var x = item.anchor.offsetLeft - 10,
            y = item.anchor.offsetTop, // Adjust for TOC scroll position
            height = item.anchor.offsetHeight;

        if (i === 0) {
            path.push('M', x, y, 'L', x, y + height);
            item.pathStart = 0;
        } else {
            // Draw an additional line when there's a change in indent levels
            if (pathIndent !== x) path.push('L', pathIndent, y);

            path.push('L', x, y);

            // Set the current path so that we can measure it
            tocPath.setAttribute('d', path.join(' '));
            item.pathStart = tocPath.getTotalLength() || 0;

            path.push('L', x, y + height);
        }

        pathIndent = x;

        tocPath.setAttribute('d', path.join(' '));
        item.pathEnd = tocPath.getTotalLength();
    });

    pathLength = tocPath.getTotalLength();

    sync();
}

function sync() {
    var windowHeight = window.innerHeight;
    var pathStart = pathLength,
        pathEnd = 0;

    var visibleItems = 0;

    tocItems.forEach(function (item) {
        var targetBounds = item.target.getBoundingClientRect();

        if (targetBounds.bottom > windowHeight * TOP_MARGIN && targetBounds.top < windowHeight * (1 - BOTTOM_MARGIN)) {
            pathStart = Math.min(item.pathStart, pathStart);
            pathEnd = Math.max(item.pathEnd, pathEnd);

            visibleItems += 1;

            item.listItem.classList.add('visible');
        } else {
            item.listItem.classList.remove('visible');
        }
    });
    // Specify the visible path or hide the path altogether if there are no visible items
    if (visibleItems > 0 && pathStart < pathEnd) {
        if (pathStart !== lastPathStart || pathEnd !== lastPathEnd) {
            tocPath.setAttribute('stroke-dashoffset', '1');
            tocPath.setAttribute('stroke-dasharray', '1, ' + pathStart + ', ' + (pathEnd - pathStart) + ', ' + pathLength);
            tocPath.setAttribute('opacity', 1);
        }
    } else {
        tocPath.setAttribute('opacity', 0);
    }

    lastPathStart = pathStart;
    lastPathEnd = pathEnd;
}

document.addEventListener('DOMContentLoaded', function () {
    // Add smooth scrolling behavior for TOC links
    document.querySelectorAll('.toc a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            // Get the target section
            const targetSection = document.querySelector(this.getAttribute('href'));

            // Calculate the offset, considering the fixed navbar height
            const navbarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 0;

            window.scrollTo({
                top: targetSection.offsetTop - navbarHeight, // Adjusted scroll position
                behavior: 'smooth'
            });
        });
    });

    // Highlight the currently visible section in the TOC
    const tocLinks = document.querySelectorAll('.toc a');
    const sections = document.querySelectorAll('section div');
    const toc = document.querySelector('.toc'); // Get the TOC container

    function onScroll() {
        let currentSection = null;
        let firstSection = -1;
        let lastSection = -1;

        sections.forEach(section => {
            const sectionTop = section.offsetTop; // Adjusted for a small margin
            const sectionBottom = sectionTop + section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY <= sectionBottom) {
                currentSection = section.id;
            }
        });

        firstSection = currentSection;
        lastSection = currentSection;

        let firstLink = null;
        let lastLink = null;

        tocLinks.forEach(link => {
            if (link.getAttribute('href').substring(1) === firstSection) {
                firstLink = link;
            }
            if (link.getAttribute('href').substring(1) === lastSection) {
                lastLink = link;
            }
        });

        scrollTOCToLink(firstLink, lastLink);
    }

    function scrollTOCToLink(firstLink, lastLink) {
        const toc = document.querySelector('.toc');
        const firstLinkTop = firstLink.offsetTop;
        const lastLinkBottom = lastLink.offsetTop + lastLink.offsetHeight;

        const tocScrollTop = toc.scrollTop;
        const tocHeight = toc.clientHeight;

        // Adjust only if the link is out of the visible area
        if (firstLinkTop < tocScrollTop + tocHeight / 3) {
            // Scroll up to bring the link into view
            toc.scrollTo({
                top: firstLinkTop - tocHeight / 3,  // 10px margin for a smoother experience
                behavior: 'smooth'
            });
        } else if (lastLinkBottom + tocHeight / 3 > tocScrollTop + tocHeight) {
            // Scroll down to bring the link into view
            toc.scrollTo({
                top: lastLinkBottom - 2 * tocHeight / 3,  // 10px margin
                behavior: 'smooth'
            });
        }
    }


    window.addEventListener('scroll', onScroll);
    onScroll(); // Run once on page load to highlight the active section
});
