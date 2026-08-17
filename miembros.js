document.addEventListener('DOMContentLoaded', loadMembersDirectory);

async function loadMembersDirectory() {
    const staffList = document.getElementById('staff-members-list');
    const membersList = document.getElementById('club-members-list');

    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select(
            'full_name, club_status, participates_in_competition, competition_name, avatar_path'
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
        card.className = 'member-card';

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

    if (error) {
        console.error('No se ha podido cargar una foto de perfil:', error);
        return;
    }

    const image = document.createElement('img');
    image.src = data.signedUrl;
    image.alt = 'Foto de perfil';

    avatar.replaceChildren(image);
}