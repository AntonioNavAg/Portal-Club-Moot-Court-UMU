document.addEventListener('DOMContentLoaded', loadProfile);

async function loadProfile() {
    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData.user;

    if (!user) return;

    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('No se ha podido cargar el perfil:', error);
        return;
    }

    if (!profile) {
        document.getElementById('profile-heading').textContent =
            'Perfil pendiente de completar';

        document.getElementById('profile-status-message').textContent =
            'Un administrador completará tu información de miembro.';

        return;
    }

    await renderProfileAvatar(profile.avatar_path);

    document.getElementById('header-profile-name').textContent =
    profile.full_name || 'Miembro del Club';

    document.getElementById('profile-full-name').textContent =
        profile.full_name || '—';

    document.getElementById('profile-club-status').textContent =
        profile.club_status === 'staff' ? 'Staff' : 'Miembro';

    document.getElementById('profile-competes').textContent =
        profile.participates_in_competition ? 'Sí' : 'No';

    document.getElementById('profile-heading').textContent =
        profile.full_name || 'Mi perfil';

    document.getElementById('profile-status-message').textContent =
        'Información gestionada por la administración del Club.';

    const competitionRow = document.getElementById(
        'profile-competition-row'
    );

    if (profile.participates_in_competition && profile.competition_name) {
        document.getElementById('profile-competition-name').textContent =
            profile.competition_name;

        competitionRow.classList.remove('hidden');
    } else {
        competitionRow.classList.add('hidden');
    }
}

async function renderProfileAvatar(avatarPath) {
    if (!avatarPath) return;

    const avatars = [
        document.getElementById('profile-avatar'),
        document.getElementById('header-profile-avatar')
    ].filter(Boolean);

    const { data, error } = await supabaseClient
        .storage
        .from('profile-photos')
        .createSignedUrl(avatarPath, 3600);

    if (error) {
        console.error('No se ha podido cargar la foto de perfil:', error);
        return;
    }

    avatars.forEach(avatar => {
        const image = document.createElement('img');

        image.src = data.signedUrl;
        image.alt = 'Foto de perfil';

        avatar.replaceChildren(image);
    });
}