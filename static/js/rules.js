document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.toc a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

document.querySelectorAll('.toc a').forEach(link => {
    link.addEventListener('click', function (event) {
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            const parentDetails = targetElement.closest('details');
            if (parentDetails && !parentDetails.open) {
                parentDetails.open = true;
            }

            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    });
});

document.querySelectorAll('summary').forEach(summary => {
    summary.addEventListener('click', function (event) {
        if (!event.target.classList.contains('summary-link')) {
            event.preventDefault();
            this.parentNode.open = !this.parentNode.open;
        }
    });
});

