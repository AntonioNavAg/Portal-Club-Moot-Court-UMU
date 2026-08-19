let displayedMonth = new Date();
displayedMonth.setDate(1);

let calendarEvents = [];
let canManageCalendar = false;

function formatDateForInput(date) {
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

async function loadCalendarPermissions() {
    const form = document.getElementById('appointment-form');

    form.classList.add('hidden');

    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData.user;

    if (!user) return;

    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('club_status')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error al comprobar permisos del calendario:', error);
        return;
    }

    canManageCalendar =
        profile?.club_status?.trim().toLowerCase() === 'staff';

    if (canManageCalendar) {
        form.classList.remove('hidden');
    }
}

async function loadCalendarEvents() {
    const { data, error } = await supabaseClient
        .from('calendar_events')
        .select('id, title, event_date, event_time, description')
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });

    if (error) {
        console.error('Error al cargar el calendario:', error);
        return;
    }

    calendarEvents = data || [];
    renderCalendar();
}

function renderCalendar() {
    const monthLabel = document.getElementById('calendar-month');
    const grid = document.getElementById('calendar-grid');

    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    monthLabel.textContent = new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric'
    }).format(displayedMonth);

    grid.replaceChildren();

    for (let index = 0; index < startOffset + daysInMonth; index += 1) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        if (index >= startOffset) {
            const day = index - startOffset + 1;

            const dateValue =
                `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const dayNumber = document.createElement('button');
            dayNumber.type = 'button';
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = day;

            dayNumber.addEventListener('click', () => {
                if (!canManageCalendar) return;

                const form = document.getElementById('appointment-form');

                document.getElementById('appointment-date').value = dateValue;

                form.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });

                setTimeout(() => {
                    document.getElementById('appointment-title').focus();
                }, 350);
            });

            dayCell.appendChild(dayNumber);

            calendarEvents
                .filter(event => event.event_date === dateValue)
                .forEach(event => {
                    const eventButton = document.createElement('button');

                    eventButton.type = 'button';
                    eventButton.className = 'calendar-event';

                    eventButton.title = [
                        event.title,
                        event.event_time,
                        event.description
                    ].filter(Boolean).join(' · ');

                    eventButton.textContent =
                        `${event.event_time ? `${event.event_time.slice(0, 5)} · ` : ''}${event.title}`;

                    if (canManageCalendar) {
                        eventButton.addEventListener('click', () => {
                            deleteCalendarEvent(event);
                        });
                    }

                    dayCell.appendChild(eventButton);
                });
        } else {
            dayCell.classList.add('calendar-day-empty');
        }

        grid.appendChild(dayCell);
    }
}

async function saveCalendarEvent(submitEvent) {
    submitEvent.preventDefault();

    if (!canManageCalendar) return;

    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData.user;

    if (!user) {
        alert('Tu sesión ha caducado. Vuelve a iniciar sesión.');
        return;
    }

    const title = document.getElementById('appointment-title').value.trim();
    const eventDate = document.getElementById('appointment-date').value;
    const eventTime = document.getElementById('appointment-time').value || null;
    const description =
        document.getElementById('appointment-description').value.trim() || null;

    if (!title || !eventDate) return;

    const { error } = await supabaseClient
        .from('calendar_events')
        .insert({
            title,
            event_date: eventDate,
            event_time: eventTime,
            description,
            created_by: user.id
        });

    if (error) {
        alert('No se ha podido guardar la cita: ' + error.message);
        return;
    }

    displayedMonth = new Date(`${eventDate}T12:00:00`);

    document.getElementById('appointment-form').reset();
    document.getElementById('appointment-date').value =
        formatDateForInput(new Date());

    await loadCalendarEvents();
}

async function deleteCalendarEvent(event) {
    const confirmed = confirm(`¿Quieres eliminar la cita “${event.title}”?`);

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

    if (error) {
        alert('No se ha podido eliminar la cita: ' + error.message);
        return;
    }

    await loadCalendarEvents();
}

async function initializeCalendar() {
    document.getElementById('appointment-date').value =
        formatDateForInput(new Date());

    document.getElementById('calendar-previous').addEventListener('click', () => {
        displayedMonth.setMonth(displayedMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('calendar-next').addEventListener('click', () => {
        displayedMonth.setMonth(displayedMonth.getMonth() + 1);
        renderCalendar();
    });

    document
        .getElementById('appointment-form')
        .addEventListener('submit', saveCalendarEvent);

    await loadCalendarPermissions();
    await loadCalendarEvents();
}

window.refreshSharedCalendar = loadCalendarEvents;

initializeCalendar();