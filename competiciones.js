document.addEventListener('DOMContentLoaded', initializeCompetitions);

const competitions = {
    aedeur: {
        label: 'COMPETICIÓN NACIONAL',
        title: 'AEDEUR Moot Court',
        icon: 'fa-scale-balanced',
        description:
            'Competición centrada en el Derecho de la Unión Europea y la argumentación jurídica ante un tribunal simulado.',
        field: 'Derecho de la Unión Europea',
        status: 'Información y preparación próximamente'
    },

    jessup: {
        label: 'COMPETICIÓN INTERNACIONAL',
        title: 'Philip C. Jessup International Law Moot Court',
        icon: 'fa-globe',
        description:
            'Una de las competiciones universitarias de Derecho Internacional Público más reconocidas del mundo.',
        field: 'Derecho Internacional Público',
        status: 'Información y preparación próximamente'
    },

    euniwell: {
        label: 'COMPETICIÓN EUROPEA',
        title: 'EUniwell Moot Court',
        icon: 'fa-landmark',
        description:
            'Espacio dedicado a la participación del Club en actividades y competiciones jurídicas de la red EUniwell.',
        field: 'Derecho europeo y cooperación universitaria',
        status: 'Información y preparación próximamente'
    }
};

function initializeCompetitions() {
    document.querySelectorAll('[data-competition]').forEach(card => {
        card.addEventListener('click', () => {
            openCompetition(card.dataset.competition);
        });

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCompetition(card.dataset.competition);
            }
        });
    });

    document
        .getElementById('back-to-competitions')
        .addEventListener('click', closeCompetition);
}

function openCompetition(competitionId) {
    const competition = competitions[competitionId];

    if (!competition) return;

    document.getElementById('competition-grid').classList.add('hidden');
    document.getElementById('competition-detail').classList.remove('hidden');

    document.getElementById('competition-detail-label').textContent =
        competition.label;

    document.getElementById('competition-detail-title').textContent =
        competition.title;

    document.getElementById('competition-detail-description').textContent =
        competition.description;

    document.getElementById('competition-detail-field').textContent =
        competition.field;

    document.getElementById('competition-detail-status').textContent =
        competition.status;

    document.getElementById('competition-detail-icon').className =
        `fa-solid ${competition.icon}`;
}

function closeCompetition() {
    document.getElementById('competition-detail').classList.add('hidden');
    document.getElementById('competition-grid').classList.remove('hidden');
}