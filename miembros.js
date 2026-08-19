document.addEventListener('DOMContentLoaded', () => {
    createMemberProfilePanel();
    createMemberEmailConfirmation();
    loadMembersDirectory();
});

async function loadMembersDirectory() {
    const staffList = document.getElementById('staff-members-list');
    const membersList = document.getElementById('club-members-list');

    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select(
'full_name, club_status, participates_in_competition, competition_name, avatar_path, contact_email'
        )
        .order('full_name', { ascending: true });

    if (error) {
        showDirectoryError(staffList, membersList);
        console.error('No se ha podido cargar el directorio:', error);
        return;
    }

    const staffProfiles = profiles.filter(
        profile => profile.club_status === 'staff'
    );

    const memberProfiles = profiles.filter(
        profile => profile.club_status !== 'staff'
    );

    renderMemberCards(staffList, staffProfiles, 'staff');
    renderMemberCards(membersList, memberProfiles, 'miembro');
}

function renderMemberCards(container, profiles, type) {
    container.replaceChildren();

    if (profiles.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'members-empty';
        emptyMessage.textContent =
            type === 'staff'
                ? 'Todavía no hay perfiles de staff.'
                : 'Todavía no hay miembros registrados.';

        container.appendChild(emptyMessage);
        return;
    }

    profiles.forEach(profile => {
        const card = document.createElement('article');
        card.className = 'member-card member-card-clickable';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        card.addEventListener('click', () => {
            openMemberProfile(profile, type);
        });

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openMemberProfile(profile, type);
            }
        });

        const avatar = document.createElement('div');
        avatar.className = `member-avatar ${type}`;
        renderMemberAvatar(avatar, profile.avatar_path, type);

        const content = document.createElement('div');
        content.className = 'member-card-content';

        const name = document.createElement('h4');
        name.textContent = profile.full_name || 'Miembro del Club';

        const status = document.createElement('span');
        status.className = `member-status ${type}`;
        status.textContent = type === 'staff' ? 'Staff' : 'Miembro';

        content.append(name, status);

        if (profile.participates_in_competition) {
            const competition = document.createElement('p');
            competition.className = 'member-competition';

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-trophy';

            const text = document.createTextNode(
                profile.competition_name || 'Participa en una competición'
            );

            competition.append(icon, text);
            content.appendChild(competition);
        }

        card.append(avatar, content);
        container.appendChild(card);
    });
}

function createMemberProfilePanel() {
    const overlay = document.createElement('div');
    overlay.className = 'member-profile-overlay';
    overlay.addEventListener('click', closeMemberProfile);

    const panel = document.createElement('aside');
    panel.id = 'member-profile-panel';
    panel.className = 'member-profile-panel';
    panel.setAttribute('aria-label', 'Ficha de miembro');

    panel.innerHTML = `
        <button
            type="button"
            class="member-profile-close"
            id="member-profile-close"
            aria-label="Cerrar ficha"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="member-profile-avatar" id="member-profile-avatar">
            <i class="fa-solid fa-user"></i>
        </div>

        <p class="welcome-label">PERFIL DEL CLUB</p>
        <h3 id="member-profile-name">Miembro del Club</h3>
        <span id="member-profile-status" class="member-profile-status">
            Miembro
        </span>

        <div class="member-profile-details">
            <div>
                <span>Participación actual</span>
                <strong id="member-profile-participation">—</strong>
            </div>

            <div id="member-profile-competition-row" class="hidden">
                <span>Competición</span>
                <strong id="member-profile-competition">—</strong>
            </div>
            <div id="member-profile-email-row" class="hidden">
    <span>Correo electrónico</span>

    <button
        type="button"
        id="member-profile-email"
        class="member-profile-email"
    >
        —
    </button>
</div>
        </div>
    `;

    panel.querySelector('#member-profile-close')
        .addEventListener('click', closeMemberProfile);

    document.body.append(overlay, panel);
}

async function openMemberProfile(profile, type) {
    const panel = document.getElementById('member-profile-panel');
    const overlay = document.querySelector('.member-profile-overlay');

    document.getElementById('member-profile-name').textContent =
        profile.full_name || 'Miembro del Club';

    const status = document.getElementById('member-profile-status');
    status.textContent = type === 'staff' ? 'Staff del Club' : 'Miembro del Club';
    status.className = `member-profile-status ${type}`;

    document.getElementById('member-profile-participation').textContent =
        profile.participates_in_competition
            ? 'Participa en una competición'
            : 'No participa actualmente';

    const competitionRow = document.getElementById(
        'member-profile-competition-row'
    );

    if (profile.participates_in_competition && profile.competition_name) {
        competitionRow.classList.remove('hidden');
        document.getElementById('member-profile-competition').textContent =
            profile.competition_name;
    } else {
        competitionRow.classList.add('hidden');
    }

    const emailRow = document.getElementById('member-profile-email-row');
const emailButton = document.getElementById('member-profile-email');
const email = profile.contact_email?.trim();

if (email) {
    emailRow.classList.remove('hidden');
    emailButton.textContent = email;

    emailButton.onclick = () => {
        openMemberEmailConfirmation(email);
    };
} else {
    emailRow.classList.add('hidden');
    emailButton.onclick = null;
}

    await renderPanelAvatar(profile.avatar_path, type);

    overlay.classList.add('is-open');
    panel.classList.add('is-open');
}

function closeMemberProfile() {
    document.querySelector('.member-profile-overlay')
        .classList.remove('is-open');

    document.getElementById('member-profile-panel')
        .classList.remove('is-open');
}

async function renderMemberAvatar(avatar, avatarPath, type) {
    avatar.innerHTML =
        type === 'staff'
            ? '<i class="fa-solid fa-user-tie"></i>'
            : '<i class="fa-solid fa-user"></i>';

    if (!avatarPath) return;

    const { data, error } = await supabaseClient
        .storage
        .from('profile-photos')
        .createSignedUrl(avatarPath, 3600);

    if (error) return;

    const image = document.createElement('img');
    image.src = data.signedUrl;
    image.alt = 'Foto de perfil';

    avatar.replaceChildren(image);
}

async function renderPanelAvatar(avatarPath, type) {
    const avatar = document.getElementById('member-profile-avatar');

    avatar.innerHTML =
        type === 'staff'
            ? '<i class="fa-solid fa-user-tie"></i>'
            : '<i class="fa-solid fa-user"></i>';

    if (!avatarPath) return;

    const { data, error } = await supabaseClient
        .storage
        .from('profile-photos')
        .createSignedUrl(avatarPath, 3600);

    if (error) return;

    const image = document.createElement('img');
    image.src = data.signedUrl;
    image.alt = 'Foto de perfil';

    avatar.replaceChildren(image);
}

let pendingMemberEmail = '';

function createMemberEmailConfirmation() {
    const overlay = document.createElement('div');
    overlay.className = 'member-email-overlay';
    overlay.addEventListener('click', closeMemberEmailConfirmation);

    const modal = document.createElement('div');
    modal.id = 'member-email-modal';
    modal.className = 'member-email-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
        <div class="member-email-modal-icon">
            <i class="fa-solid fa-envelope"></i>
        </div>

        <h3>¿Abrir correo electrónico?</h3>

        <p>
            Vas a abrir tu aplicación de correo para escribir a este miembro.
            ¿Quieres continuar?
        </p>

        <div class="member-email-modal-actions">
            <button
                type="button"
                class="member-email-cancel"
                id="member-email-cancel"
            >
                Cancelar
            </button>

            <button
                type="button"
                class="member-email-confirm"
                id="member-email-confirm"
            >
                <i class="fa-solid fa-envelope"></i>
                Continuar
            </button>
        </div>
    `;

    modal.querySelector('#member-email-cancel')
        .addEventListener('click', closeMemberEmailConfirmation);

    modal.querySelector('#member-email-confirm')
        .addEventListener('click', confirmMemberEmail);

    document.body.append(overlay, modal);
}

function openMemberEmailConfirmation(email) {
    pendingMemberEmail = email;

    document.querySelector('.member-email-overlay')
        .classList.add('is-open');

    document.getElementById('member-email-modal')
        .classList.add('is-open');
}

function closeMemberEmailConfirmation() {
    document.querySelector('.member-email-overlay')
        .classList.remove('is-open');

    document.getElementById('member-email-modal')
        .classList.remove('is-open');

    pendingMemberEmail = '';
}

function confirmMemberEmail() {
    if (!pendingMemberEmail) return;

    window.location.href =
        `mailto:${encodeURIComponent(pendingMemberEmail)}`;

    closeMemberEmailConfirmation();
}

function showDirectoryError(staffList, membersList) {
    const message = 'No se ha podido cargar el directorio.';

    [staffList, membersList].forEach(container => {
        container.replaceChildren();

        const errorMessage = document.createElement('p');
        errorMessage.className = 'members-empty';
        errorMessage.textContent = message;

        container.appendChild(errorMessage);
    });
}