const storageBucket = 'club-materiales';

let activeResource = null;
let filePendingDeletion = null;

document.addEventListener('DOMContentLoaded', () => {
    const resourceCards = document.querySelectorAll('[data-resource-folder]');
    const fileInput = document.getElementById('legal-english-file-input');
    const deleteModal = document.getElementById('delete-file-modal');
    const cancelDeleteButton = document.getElementById('cancel-file-delete');
    const confirmDeleteButton = document.getElementById('confirm-file-delete');

    resourceCards.forEach(card => {
        card.addEventListener('click', () => openResourceFolder(card));

        card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openResourceFolder(card);
            }
        });
    });

    fileInput.addEventListener('change', uploadResourceFile);

    cancelDeleteButton.addEventListener('click', closeDeleteModal);
    confirmDeleteButton.addEventListener('click', confirmFileDeletion);

    deleteModal.addEventListener('click', event => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
});

async function openResourceFolder(card) {
    activeResource = {
        folder: card.dataset.resourceFolder,
        title: card.dataset.resourceTitle,
        description: card.dataset.resourceDescription,
        icon: card.dataset.resourceIcon
    };

    document.getElementById('resource-grid').classList.add('hidden');
    document.getElementById('legal-english-view').classList.remove('hidden');

    const panel = document.getElementById('legal-english-view');

    panel.querySelector('.resource-detail-header h3').textContent =
        activeResource.title;

    panel.querySelector(
        '.resource-detail-header p:not(.welcome-label)'
    ).textContent = activeResource.description;

    panel.querySelector('.resource-detail-header .resource-icon i').className =
        `fa-solid ${activeResource.icon}`;

    await loadResourceFiles();
}

function closeLegalEnglish() {
    document.getElementById('legal-english-view').classList.add('hidden');
    document.getElementById('resource-grid').classList.remove('hidden');
    document.getElementById('file-preview').classList.add('hidden');

    activeResource = null;
}

async function loadResourceFiles() {
    const fileList = document.getElementById('legal-english-file-list');

    if (!activeResource) return;

    fileList.innerHTML =
        '<p class="empty-file-list">Cargando archivos…</p>';

    const { data: files, error } = await supabaseClient
        .from('resource_files')
        .select('*')
        .eq('category', activeResource.folder)
        .order('created_at', { ascending: false });

    if (error) {
        fileList.innerHTML = `
            <div class="empty-file-list">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>No se han podido cargar los archivos.</p>
            </div>
        `;
        return;
    }

    if (files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-file-list">
                <i class="fa-solid fa-folder-open"></i>
                <p>Aún no hay archivos en esta carpeta.</p>
            </div>
        `;
        return;
    }

    fileList.replaceChildren();

    files.forEach(file => {
        const item = document.createElement('article');
        item.className = 'file-item';

        const icon = document.createElement('i');
        icon.className = getFileIcon(file.original_name);

        const details = document.createElement('div');
        details.className = 'file-details';

        const title = document.createElement('strong');
        title.textContent = file.title;

        const information = document.createElement('span');
        information.textContent =
            `${file.original_name} · ${formatFileSize(file.file_size)}`;

        details.append(title, information);

        const previewButton = document.createElement('button');
        previewButton.type = 'button';
        previewButton.className = 'file-open-btn';
        previewButton.innerHTML =
            '<i class="fa-solid fa-eye"></i> Ver archivo';
        previewButton.addEventListener('click', () => previewFile(file));

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'file-delete-btn';
        deleteButton.setAttribute('aria-label', 'Eliminar archivo');
        deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteButton.addEventListener('click', () => deleteFile(file));

        item.append(icon, details, previewButton, deleteButton);
        fileList.appendChild(item);
    });
}

async function uploadResourceFile(event) {
    const file = event.target.files[0];

    if (!file || !activeResource) return;

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
        alert('Solo puedes subir archivos PDF, DOC o DOCX.');
        event.target.value = '';
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        alert('El archivo no puede superar 20 MB.');
        event.target.value = '';
        return;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData.user;

    if (!user) {
        alert('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath =
        `${activeResource.folder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseClient
        .storage
        .from(storageBucket)
        .upload(storagePath, file);

    if (uploadError) {
        alert('No se ha podido subir el archivo: ' + uploadError.message);
        event.target.value = '';
        return;
    }

    const { error: databaseError } = await supabaseClient
        .from('resource_files')
        .insert({
            title: file.name.replace(/\.[^/.]+$/, ''),
            category: activeResource.folder,
            storage_path: storagePath,
            original_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            uploaded_by: user.id
        });

    if (databaseError) {
        await supabaseClient
            .storage
            .from(storageBucket)
            .remove([storagePath]);

        alert('No se ha podido registrar el archivo: ' + databaseError.message);
        event.target.value = '';
        return;
    }

    event.target.value = '';
    await loadResourceFiles();
}

async function previewFile(file) {
    const preview = document.getElementById('file-preview');

    const { data, error } = await supabaseClient
        .storage
        .from(storageBucket)
        .createSignedUrl(file.storage_path, 3600);

    if (error) {
        alert('No se ha podido abrir el archivo: ' + error.message);
        return;
    }

    preview.replaceChildren();
    preview.classList.remove('hidden');

    const header = document.createElement('div');
    header.className = 'file-preview-header';

    const name = document.createElement('strong');
    name.textContent = file.original_name;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeButton.setAttribute('aria-label', 'Cerrar vista previa');
    closeButton.addEventListener('click', () => {
        preview.classList.add('hidden');
        preview.replaceChildren();
    });

    header.append(name, closeButton);
    preview.appendChild(header);

    if (file.mime_type === 'application/pdf') {
        const frame = document.createElement('iframe');
        frame.src = data.signedUrl;
        frame.title = `Vista previa de ${file.original_name}`;
        preview.appendChild(frame);
        return;
    }

    const message = document.createElement('p');
    message.textContent =
        'Los archivos Word no se pueden previsualizar aquí. Puedes abrirlos o descargarlos.';

    const downloadLink = document.createElement('a');
    downloadLink.href = data.signedUrl;
    downloadLink.target = '_blank';
    downloadLink.rel = 'noopener';
    downloadLink.className = 'file-open-btn';
    downloadLink.innerHTML =
        '<i class="fa-solid fa-download"></i> Abrir o descargar';

    preview.append(message, downloadLink);
}

function deleteFile(file) {
    filePendingDeletion = file;

    document.getElementById('delete-file-message').textContent =
        `¿Quieres eliminar definitivamente “${file.original_name}”?`;

    document.getElementById('delete-file-modal').classList.remove('hidden');
}

function closeDeleteModal() {
    filePendingDeletion = null;
    document.getElementById('delete-file-modal').classList.add('hidden');
}

async function confirmFileDeletion() {
    const file = filePendingDeletion;

    if (!file) return;

    const confirmButton = document.getElementById('confirm-file-delete');

    confirmButton.disabled = true;
    confirmButton.textContent = 'Eliminando…';

    const { error: storageError } = await supabaseClient
        .storage
        .from(storageBucket)
        .remove([file.storage_path]);

    const objectMissing =
        storageError &&
        storageError.message.toLowerCase().includes('not found');

    if (storageError && !objectMissing) {
        alert('No se ha podido eliminar el archivo: ' + storageError.message);
        confirmButton.disabled = false;
        confirmButton.innerHTML =
            '<i class="fa-solid fa-trash"></i> Eliminar';
        return;
    }

    const { error: databaseError } = await supabaseClient
        .from('resource_files')
        .delete()
        .eq('id', file.id);

    if (databaseError) {
        alert('No se ha podido eliminar el registro: ' + databaseError.message);
        confirmButton.disabled = false;
        confirmButton.innerHTML =
            '<i class="fa-solid fa-trash"></i> Eliminar';
        return;
    }

    document.getElementById('file-preview').classList.add('hidden');
    closeDeleteModal();

    confirmButton.disabled = false;
    confirmButton.innerHTML =
        '<i class="fa-solid fa-trash"></i> Eliminar';

    await loadResourceFiles();
}

function getFileIcon(fileName) {
    if (fileName.toLowerCase().endsWith('.pdf')) {
        return 'fa-solid fa-file-pdf';
    }

    return 'fa-solid fa-file-word';
}

function formatFileSize(bytes) {
    if (!bytes) return 'Tamaño desconocido';

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}