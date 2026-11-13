"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../lib/firebase'; 

// --- Constants ---
const ADMIN_PIN = '1111'; 

const shortDays = ['ΚΥΡ', 'ΔΕΥ', 'ΤΡΙ', 'ΤΕΤ', 'ΠΕΜ', 'ΠΑΡ', 'ΣΑΒ'];
const monthsGreek = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'];
const shortMonths = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

const defaultScheduleSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', 
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', 
    '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
];

const allPossibleSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', 
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
];

const defaultWeeklySchedule = Array.from({ length: 7 }).reduce((acc: Record<string, { isOpen: boolean, slots: string[] }>, _, i) => {
    acc[i.toString()] = { isOpen: i !== 0, slots: defaultScheduleSlots };
    return acc;
}, {});

const EMPTY_OBJ: Record<string, any> = {};
const EMPTY_ARR: string[] = [];

// --- Firebase Empty Array Fallback Helper ---
const safeGetSchedule = (primary: any, secondary?: any) => {
    if (primary && typeof primary === 'object') return { isOpen: primary.isOpen ?? true, slots: Array.isArray(primary.slots) ? primary.slots : [] };
    if (secondary && typeof secondary === 'object') return { isOpen: secondary.isOpen ?? true, slots: Array.isArray(secondary.slots) ? secondary.slots : [] };
    return { isOpen: true, slots: defaultScheduleSlots };
};

// --- Καθαρισμός undefined τιμών για να μην κρασάρει η Firebase ---
const sanitizeForFirebase = (obj: Record<string, any>) => {
    const clean: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    });
    return clean;
};

// --- Types ---
type AppointmentSlotProps = {
    userId: string;
    dateStr: string;
    time: string;
    activeAppt: any;
    isPermanent: boolean;
    isFixedBreak: boolean;
    isHighlighted: boolean;
    isGuest: boolean;
    onUpdate: (time: string, payload: any) => void;
    onTogglePermanent: (time: string, makePermanent: boolean, payload: any) => void;
};

// --- Helpers ---
const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatGreekDate = (dStr: string) => {
    const d = new Date(dStr);
    return `${shortDays[d.getDay()]} ${d.getDate()} ${shortMonths[d.getMonth()]}`;
};

// --- OPTIMIZED COMPONENT ΓΙΑ ΚΑΘΕ ΡΑΝΤΕΒΟΥ ---
const AppointmentSlot = React.memo(function AppointmentSlot({
    userId,
    dateStr,
    time,
    activeAppt,
    isPermanent,
    isFixedBreak,
    isHighlighted,
    isGuest,
    onUpdate,
    onTogglePermanent
}: AppointmentSlotProps) {
    const [localName, setLocalName] = useState(activeAppt?.name || '');
    const [localComment, setLocalComment] = useState(activeAppt?.comment || '');
    const [localDuration, setLocalDuration] = useState<number>(activeAppt?.duration || 30);
    const [localPermPending, setLocalPermPending] = useState<boolean>(isPermanent);
    const [confirmCancel, setConfirmCancel] = useState(false);

    useEffect(() => {
        setLocalName(activeAppt?.name || '');
        setLocalComment(activeAppt?.comment || '');
        setLocalDuration(activeAppt?.duration || 30);
        setLocalPermPending(isPermanent);
        setConfirmCancel(false);
    }, [activeAppt?.name, activeAppt?.comment, activeAppt?.duration, isPermanent, userId, dateStr]);

    const nameVal = activeAppt?.name || '';
    const status = activeAppt?.status || 'PENDING';
    const isCompleted = activeAppt?.isCompleted || false;

    const displayBreakName = !nameVal && isFixedBreak ? 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' : nameVal;
    const isBreakSlot = displayBreakName === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || displayBreakName === 'ΔΙΑΛΕΙΜΜΑ';

    let cardClass = 'bg-zinc-900 border-zinc-800';
    let indicatorClass = 'bg-zinc-700';
    let inputColorClass = 'text-white';
    
    if (isBreakSlot) {
        cardClass = 'bg-red-950/20 border-red-900/50';
        indicatorClass = 'bg-red-500';
        inputColorClass = 'text-red-400';
    } else if (localName || nameVal) {
        if (status === 'PENDING') {
            indicatorClass = 'bg-zinc-400';
            inputColorClass = 'text-zinc-200';
        }
        if (status === 'APPROVED') {
            indicatorClass = 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]';
            inputColorClass = 'text-white';
        }
        if (isCompleted) {
            cardClass = 'bg-zinc-950 border-zinc-900 opacity-65';
            indicatorClass = 'bg-zinc-600';
            inputColorClass = 'text-zinc-500 line-through';
        }
    }

    const showDetails = (localName.trim() !== '' || nameVal !== '') && !isBreakSlot;

    const saveNameChange = () => {
        const trimmedName = localName.trim();
        if (trimmedName !== (activeAppt?.name || '')) {
            if (trimmedName === '') {
                onUpdate(time, { isCancelled: true, name: '' });
            } else {
                const payload: Record<string, any> = {
                    name: trimmedName,
                    comment: localComment.trim(),
                    status: activeAppt?.status || 'APPROVED',
                    isCompleted: isCompleted
                };
                if (isGuest) payload.duration = localDuration;
                onUpdate(time, payload);

                if (localPermPending || isPermanent) {
                    onTogglePermanent(time, true, payload);
                }
            }
        }
    };

    const saveCommentChange = () => {
        const trimmedComment = localComment.trim();
        if (trimmedComment !== (activeAppt?.comment || '')) {
            const payload: Record<string, any> = {
                name: localName.trim() || nameVal,
                comment: trimmedComment,
                status: status,
                isCompleted: isCompleted
            };
            if (isGuest) payload.duration = localDuration;
            onUpdate(time, payload);

            if (isPermanent) {
                onTogglePermanent(time, true, payload);
            }
        }
    };

    return (
        <div
            id={`appointment-${time}`}
            className={`flex flex-col border rounded-2xl p-4 transition-colors duration-150 ${cardClass} ${
                isHighlighted ? 'border-white ring-2 ring-white/30' : ''
            }`}
        >
            <div className="flex gap-4">
                <div className="flex flex-col items-center justify-start mt-1 shrink-0 w-[54px]">
                    <span className={`text-xl font-black tracking-tight ${isBreakSlot ? 'text-red-500' : 'text-white'}`}>
                        {time}
                    </span>
                    {isGuest && activeAppt?.duration && !isBreakSlot && (
                        <span className="text-[0.65rem] font-bold text-zinc-400 mt-0.5">{activeAppt.duration}'</span>
                    )}
                    {(isPermanent || (localPermPending && (localName.trim() || nameVal))) && !isBreakSlot && (
                        <span className="text-[0.55rem] font-extrabold text-black bg-white px-1.5 py-0.5 rounded mt-1 tracking-wider uppercase">
                            ΜΟΝΙΜΟ
                        </span>
                    )}
                </div>
                <div className={`w-1.5 rounded-full shrink-0 ${indicatorClass}`}></div>
                
                <div className="flex-1 py-1 min-w-0 flex flex-col gap-2">
                    <input
                        type="text"
                        className={`w-full bg-transparent border-none outline-none font-bold text-lg p-0 placeholder:font-normal placeholder:text-zinc-600 ${inputColorClass}`}
                        value={displayBreakName === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' ? displayBreakName : localName}
                        placeholder="Όνομα πελάτη..."
                        readOnly={displayBreakName === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ'}
                        onChange={e => setLocalName(e.target.value)}
                        onBlur={saveNameChange}
                        onKeyDown={e => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                    />
                    {showDetails && (
                        <input
                            type="text"
                            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
                                isCompleted
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600 line-through'
                                    : 'bg-black border-zinc-800 text-zinc-200 focus:border-white/60'
                            }`}
                            value={localComment}
                            placeholder="Σχόλιο / Λεπτομέρειες..."
                            onChange={e => setLocalComment(e.target.value)}
                            onBlur={saveCommentChange}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                        />
                    )}
                </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-800/80 min-h-[50px] gap-2">
                <div className="flex-1">
                    {isGuest && !isBreakSlot && !isCompleted && !confirmCancel && (
                        <div className="flex gap-1.5">
                            {[15, 30, 35, 45].map(dur => (
                                <button
                                    type="button"
                                    key={dur}
                                    onClick={() => {
                                        setLocalDuration(dur);
                                        const currentName = localName.trim() || nameVal;
                                        if (currentName) {
                                            const payload = {
                                                name: currentName,
                                                comment: localComment.trim(),
                                                status: status,
                                                isCompleted: isCompleted,
                                                duration: dur
                                            };
                                            onUpdate(time, payload);
                                            if (isPermanent) {
                                                onTogglePermanent(time, true, payload);
                                            }
                                        }
                                    }}
                                    className={`w-[34px] h-[34px] flex items-center justify-center text-[0.65rem] font-bold rounded-xl transition-colors border ${
                                        localDuration === dur
                                            ? 'bg-white text-black border-white'
                                            : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-500 hover:text-white'
                                    }`}
                                >
                                    {dur}'
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-1.5 sm:gap-2 justify-end">
                    {confirmCancel ? (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="text-[0.65rem] font-bold text-red-500 uppercase tracking-widest mr-1">Διαγραφή;</span>
                            <button
                                type="button"
                                onClick={() => setConfirmCancel(false)}
                                className="px-2.5 h-[38px] flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 border border-zinc-700"
                            >
                                ΑΚΥΡΟ
                            </button>
                            {isPermanent ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocalName('');
                                            setLocalComment('');
                                            onUpdate(time, { isCancelled: true, name: '' });
                                            setConfirmCancel(false);
                                        }}
                                        className="px-2.5 h-[38px] flex items-center justify-center rounded-xl bg-zinc-700 text-white font-bold text-xs hover:bg-zinc-600"
                                        title="Ακύρωση μόνο για σήμερα"
                                    >
                                        ΣΗΜΕΡΑ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocalName('');
                                            setLocalComment('');
                                            setLocalPermPending(false);
                                            onTogglePermanent(time, false, null);
                                            onUpdate(time, { isCancelled: true, name: '' });
                                            setConfirmCancel(false);
                                        }}
                                        className="px-2.5 h-[38px] flex items-center justify-center rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500"
                                        title="Οριστική διαγραφή από όλες τις εβδομάδες"
                                    >
                                        ΜΟΝΙΜΑ
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLocalName('');
                                        setLocalComment('');
                                        onUpdate(time, { isCancelled: true, name: '' });
                                        setConfirmCancel(false);
                                    }}
                                    className="px-3 h-[38px] flex items-center justify-center rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500"
                                >
                                    ΔΙΑΓΡΑΦΗ
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    const currentName = localName.trim() || nameVal;
                                    if (!currentName) return;
                                    const payload: Record<string, any> = {
                                        name: currentName,
                                        comment: localComment.trim(),
                                        status: status === 'APPROVED' ? 'PENDING' : 'APPROVED',
                                        isCompleted: isCompleted
                                    };
                                    if (isGuest) payload.duration = localDuration;
                                    onUpdate(time, payload);
                                }}
                                title="Έγκριση ραντεβού"
                                className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl border transition-colors ${
                                    status === 'APPROVED' && (localName.trim() || nameVal) && !isBreakSlot
                                        ? 'bg-white text-black border-white font-bold'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                }`}
                            >
                                ✓
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const currentName = localName.trim() || nameVal;
                                    if (!currentName) return;
                                    const payload: Record<string, any> = {
                                        name: currentName,
                                        comment: localComment.trim(),
                                        status: status,
                                        isCompleted: !isCompleted
                                    };
                                    if (isGuest) payload.duration = localDuration;
                                    onUpdate(time, payload);
                                }}
                                title="Ολοκλήρωση ραντεβού"
                                className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl border transition-colors ${
                                    isCompleted
                                        ? 'bg-zinc-700 border-zinc-500 text-white'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                }`}
                            >
                                ✔
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isBreakSlot) return;
                                    const currentName = localName.trim() || nameVal;
                                    const nextPerm = !localPermPending;
                                    setLocalPermPending(nextPerm);

                                    if (currentName) {
                                        const payload: Record<string, any> = {
                                            name: currentName,
                                            comment: localComment.trim(),
                                            status: 'APPROVED',
                                            isCompleted: isCompleted
                                        };
                                        if (isGuest) payload.duration = localDuration;
                                        onUpdate(time, payload);
                                        onTogglePermanent(time, nextPerm, payload);
                                    }
                                }}
                                title="Μόνιμο ραντεβού (κάθε εβδομάδα ίδια μέρα & ώρα)"
                                className={`w-[38px] h-[38px] flex items-center justify-center rounded-xl border transition-colors text-base font-bold ${
                                    (isPermanent || localPermPending) && !isBreakSlot
                                        ? 'bg-white text-black border-white'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                                }`}
                            >
                                ↻
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLocalName('ΔΙΑΛΕΙΜΜΑ');
                                    setLocalComment('');
                                    setLocalPermPending(false);
                                    onUpdate(time, { name: 'ΔΙΑΛΕΙΜΜΑ', comment: '', status: 'APPROVED', isCompleted: false });
                                }}
                                title="Διάλειμμα"
                                className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                            >
                                ॥
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmCancel(true)}
                                title="Διαγραφή"
                                className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-red-950/30 border border-red-900/50 text-red-500 hover:bg-red-900/40 transition-colors"
                            >
                                ✕
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    return prev.userId === next.userId &&
           prev.dateStr === next.dateStr &&
           prev.time === next.time &&
           prev.isPermanent === next.isPermanent &&
           prev.isFixedBreak === next.isFixedBreak &&
           prev.isHighlighted === next.isHighlighted &&
           prev.isGuest === next.isGuest &&
           prev.activeAppt?.name === next.activeAppt?.name &&
           prev.activeAppt?.comment === next.activeAppt?.comment &&
           prev.activeAppt?.status === next.activeAppt?.status &&
           prev.activeAppt?.isCompleted === next.activeAppt?.isCompleted &&
           prev.activeAppt?.duration === next.activeAppt?.duration;
});

export default function AdminPanel() {
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    
    // UI states
    const [activeTab, setActiveTab] = useState<'appointments' | 'schedule' | 'settings'>('appointments');
    const [currentDateObj, setCurrentDateObj] = useState<Date>(() => new Date());

    const dateStr = formatDateStr(currentDateObj);
    const dayOfWeek = currentDateObj.getDay(); 

    // Multi-User States
    const [usersList, setUsersList] = useState<{id: string, name: string}[]>([{ id: 'guest', name: 'Γκεστ' }]);
    const [activeUserId, setActiveUserId] = useState<string>('guest');
    const [allUserData, setAllUserData] = useState<Record<string, any>>({});
    const [newUserName, setNewUserName] = useState('');

    const [activeSettingsDay, setActiveSettingsDay] = useState<number>(1); 

    // Refs για άμεση πρόσβαση χωρίς stale closures
    const allUserDataRef = useRef<Record<string, any>>({});
    const activeUserIdRef = useRef<string>('guest');
    const dateStrRef = useRef<string>(dateStr);
    const dayOfWeekRef = useRef<number>(dayOfWeek);

    useEffect(() => { allUserDataRef.current = allUserData; }, [allUserData]);
    useEffect(() => { activeUserIdRef.current = activeUserId; }, [activeUserId]);
    useEffect(() => { dateStrRef.current = dateStr; }, [dateStr]);
    useEffect(() => { dayOfWeekRef.current = dayOfWeek; }, [dayOfWeek]);

    const currentUserData = allUserData[activeUserId] || EMPTY_OBJ;
    const appointments = currentUserData.appointments || EMPTY_OBJ;
    const permanent = currentUserData.permanent || EMPTY_OBJ;
    const customTimes = currentUserData.customTimes || EMPTY_OBJ;
    const fixedBreaks = currentUserData.fixedBreaks || EMPTY_ARR;
    const schedulesMap = currentUserData.schedulesMap || EMPTY_OBJ;
    const weeklySchedule = currentUserData.weeklySchedule || defaultWeeklySchedule;

    const currentDaySchedule = safeGetSchedule(schedulesMap[dateStr], weeklySchedule[dayOfWeek.toString()]);
    const settingsDaySchedule = safeGetSchedule(weeklySchedule[activeSettingsDay.toString()]);

    const [activeModal, setActiveModal] = useState<'NONE' | 'ADD_TIME' | 'ADD_USER'>('NONE');
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    
    const [customH, setCustomH] = useState('12');
    const [customM, setCustomM] = useState('00');

    // Search and Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyFree, setShowOnlyFree] = useState(false);

    // --- Firebase DB Listener ---
    useEffect(() => {
        setIsClient(true);
        const hasAccess = localStorage.getItem('loading_admin_access');
        if (hasAccess === 'true') {
            setIsAuthenticated(true);
        }

        const dbRef = ref(db, 'loading');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            const loadedUsers = data.usersList || [{ id: 'guest', name: 'Γκεστ' }];
            setUsersList(loadedUsers);

            const loadedUserData = data.userData ? { ...data.userData } : {};
            
            if (!loadedUserData.guest && (data.appointments || data.weeklySchedule || data.customTimes || data.permanent)) {
                loadedUserData.guest = {
                    appointments: data.appointments || {},
                    permanent: data.permanent || {},
                    schedulesMap: data.schedulesMap || {},
                    customTimes: data.customTimes || {},
                    fixedBreaks: data.fixedBreaks || [],
                    weeklySchedule: data.weeklySchedule || defaultWeeklySchedule
                };
            }

            allUserDataRef.current = loadedUserData;
            setAllUserData(loadedUserData);
        });

        return () => unsubscribe();
    }, []);

    const handleLogin = () => {
        if (pinInput === ADMIN_PIN) {
            setIsAuthenticated(true);
            localStorage.setItem('loading_admin_access', 'true');
            setPinInput('');
        } else {
            alert('Μη έγκυρο PIN.');
            setPinInput('');
        }
    };

    const handleLogout = () => {
        if (confirm("Αποσύνδεση από το σύστημα;")) {
            localStorage.removeItem('loading_admin_access');
            setIsAuthenticated(false);
        }
    };

    const handleAddUser = () => {
        if (!newUserName.trim()) return;
        const newId = 'user_' + Date.now();
        const newUsersList = [...usersList, { id: newId, name: newUserName.trim() }];
        
        const initialUserPayload = {
            weeklySchedule: defaultWeeklySchedule
        };

        Promise.all([
            set(ref(db, 'loading/usersList'), newUsersList),
            set(ref(db, `loading/userData/${newId}`), initialUserPayload)
        ]).then(() => {
            setActiveUserId(newId);
            setActiveModal('NONE');
            setNewUserName('');
        }).catch(console.error);
    };

    const handleDeleteUser = (userIdToDelete: string, userName: string) => {
        if (userIdToDelete === 'guest') return; 
        if (confirm(`Σίγουρα θέλετε να διαγράψετε τον χρήστη "${userName}" και όλα του τα ραντεβού; Η ενέργεια δεν αναιρείται.`)) {
            const newUsersList = usersList.filter((u: any) => u.id !== userIdToDelete);
            set(ref(db, 'loading/usersList'), newUsersList).catch(console.error);
            remove(ref(db, `loading/userData/${userIdToDelete}`)).catch(console.error);
            if (activeUserId === userIdToDelete) setActiveUserId('guest');
        }
    };

    const saveDailySchedule = useCallback((isOpen: boolean, slots: string[], targetUserId?: string, targetDateStr?: string) => {
        const uid = targetUserId || activeUserIdRef.current;
        const dStr = targetDateStr || dateStrRef.current;

        setAllUserData(prev => {
            const nextState = {
                ...prev,
                [uid]: {
                    ...(prev[uid] || {}),
                    schedulesMap: { ...((prev[uid] || {}).schedulesMap || {}), [dStr]: { isOpen, slots } }
                }
            };
            allUserDataRef.current = nextState;
            return nextState;
        });
        set(ref(db, `loading/userData/${uid}/schedulesMap/${dStr}`), { isOpen, slots }).catch(console.error);
    }, []);

    const applyDurationLogic = useCallback((startTime: string, duration: number, uid: string, dStr: string, dOfWeek: number) => {
        const [hStr, mStr] = startTime.split(':');
        const startMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
        const endMins = startMins + duration;
        const endH = Math.floor(endMins / 60); 
        const endM = endMins % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        const userObj = allUserDataRef.current[uid] || {};
        const userWeekly = userObj.weeklySchedule || defaultWeeklySchedule;
        const userSchedulesMap = userObj.schedulesMap || {};
        const userCustomTimes = userObj.customTimes || {};

        const daySchedObj = safeGetSchedule(userSchedulesMap[dStr], userWeekly[dOfWeek.toString()]);
        const baseSlots = safeGetSchedule(userWeekly[dOfWeek.toString()]).slots;
        const maxBaseSlot = [...baseSlots].sort().pop() || "23:59";
        const daySlots = daySchedObj.slots;
        const maxSlotStr = [...daySlots].sort().pop() || maxBaseSlot;

        let updatedDaySlots = [...daySlots];

        const newSlots = updatedDaySlots.filter((s: string) => !(s > startTime && s < endTimeStr));
        if (newSlots.length !== updatedDaySlots.length) {
            updatedDaySlots = newSlots;
            saveDailySchedule(daySchedObj.isOpen, updatedDaySlots, uid, dStr);
        }

        if (endTimeStr <= maxSlotStr) {
            const existingCustoms = userCustomTimes[dStr] || [];
            const newCustoms = existingCustoms.filter((s: string) => !(s > startTime && s < endTimeStr));
            if (!updatedDaySlots.includes(endTimeStr) && !newCustoms.includes(endTimeStr)) {
                newCustoms.push(endTimeStr);
                setAllUserData(prev => {
                    const nextState = {
                        ...prev,
                        [uid]: {
                            ...(prev[uid] || {}),
                            customTimes: { ...((prev[uid] || {}).customTimes || {}), [dStr]: newCustoms }
                        }
                    };
                    allUserDataRef.current = nextState;
                    return nextState;
                });
                set(ref(db, `loading/userData/${uid}/customTimes/${dStr}`), newCustoms).catch(console.error);
            }
        }
    }, [saveDailySchedule]);

    // Αποθήκευση / Αφαίρεση Μόνιμου Ραντεβού (ίδια μέρα & ώρα κάθε εβδομάδα)
    const handleTogglePermanent = useCallback((time: string, makePermanent: boolean, payload: any) => {
        const uid = activeUserIdRef.current;
        const dOfWeek = dayOfWeekRef.current;
        const dayKey = `day_${dOfWeek}`;

        if (makePermanent && payload && payload.name) {
            const permData = sanitizeForFirebase({
                name: payload.name,
                comment: payload.comment || '',
                duration: uid === 'guest' ? (payload.duration || 30) : undefined
            });

            setAllUserData(prev => {
                const userSpecific = prev[uid] || {};
                const userPerm = userSpecific.permanent || {};
                const dayPerm = userPerm[dayKey] || {};

                const nextState = {
                    ...prev,
                    [uid]: {
                        ...userSpecific,
                        permanent: {
                            ...userPerm,
                            [dayKey]: { ...dayPerm, [time]: permData }
                        }
                    }
                };
                allUserDataRef.current = nextState;
                return nextState;
            });

            set(ref(db, `loading/userData/${uid}/permanent/${dayKey}/${time}`), permData).catch(console.error);
        } else {
            setAllUserData(prev => {
                const userSpecific = prev[uid] || {};
                const userPerm = { ...(userSpecific.permanent || {}) };
                const dayPerm = { ...(userPerm[dayKey] || {}) };
                delete dayPerm[time];
                userPerm[dayKey] = dayPerm;

                if (userPerm[dOfWeek]) {
                    const legacyDayPerm = { ...userPerm[dOfWeek] };
                    delete legacyDayPerm[time];
                    userPerm[dOfWeek] = legacyDayPerm;
                }

                const nextState = {
                    ...prev,
                    [uid]: {
                        ...userSpecific,
                        permanent: userPerm
                    }
                };
                allUserDataRef.current = nextState;
                return nextState;
            });

            remove(ref(db, `loading/userData/${uid}/permanent/${dayKey}/${time}`)).catch(console.error);
            remove(ref(db, `loading/userData/${uid}/permanent/${dOfWeek}/${time}`)).catch(console.error);
        }
    }, []);

    // Σταθερή συνάρτηση αποθήκευσης ραντεβού ημέρας
    const handleSlotUpdate = useCallback((time: string, payload: any) => {
        const uid = activeUserIdRef.current;
        const dStr = dateStrRef.current;
        const dOfWeek = dayOfWeekRef.current;
        const dayKey = `day_${dOfWeek}`;

        const currentAppt = allUserDataRef.current[uid]?.appointments?.[dStr]?.[time] || {};
        const existingPerm = allUserDataRef.current[uid]?.permanent?.[dayKey]?.[time] || allUserDataRef.current[uid]?.permanent?.[dOfWeek]?.[time];
        const updatedAppt = sanitizeForFirebase({ ...currentAppt, ...payload });
        
        setAllUserData(prev => {
            const userSpecific = prev[uid] || {};
            const userAppts = userSpecific.appointments || {};
            const dayAppts = userAppts[dStr] || {};
            
            const newDayAppts = { ...dayAppts };
            if (payload.isCancelled && !existingPerm) {
                delete newDayAppts[time];
            } else {
                newDayAppts[time] = updatedAppt;
            }
            
            const nextState = {
                ...prev,
                [uid]: { ...userSpecific, appointments: { ...userAppts, [dStr]: newDayAppts } }
            };
            allUserDataRef.current = nextState;
            return nextState;
        });

        const apptRef = ref(db, `loading/userData/${uid}/appointments/${dStr}/${time}`);
        if (payload.isCancelled && !existingPerm) {
            remove(apptRef).catch(console.error);
        } else {
            // Αν υπάρχει μόνιμο ραντεβού και επιλέχθηκε "ΣΗΜΕΡΑ", αποθηκεύουμε { isCancelled: true } για να μην εμφανιστεί σήμερα
            set(apptRef, updatedAppt).catch(console.error);
        }

        if (uid === 'guest' && updatedAppt.duration && updatedAppt.name && updatedAppt.name !== 'ΔΙΑΛΕΙΜΜΑ' && !payload.isCancelled) {
            applyDurationLogic(time, updatedAppt.duration, uid, dStr, dOfWeek);
        }
    }, [applyDurationLogic]);

    const toggleDayStatus = () => {
        saveDailySchedule(!currentDaySchedule.isOpen, currentDaySchedule.slots);
    };

    const toggleSpecificSlot = (slot: string) => {
        let updatedSlots;
        if (currentDaySchedule.slots.includes(slot)) {
            updatedSlots = currentDaySchedule.slots.filter((s: string) => s !== slot);
        } else {
            updatedSlots = [...currentDaySchedule.slots, slot].sort();
        }
        saveDailySchedule(currentDaySchedule.isOpen, updatedSlots);
    };

    const resetToDefaultSlots = () => {
        saveDailySchedule(currentDaySchedule.isOpen, defaultScheduleSlots);
    };

    const clearAllSlots = () => {
        saveDailySchedule(currentDaySchedule.isOpen, []);
    };

    const saveWeeklySchedule = (dayIdx: number, isOpen: boolean, slots: string[]) => {
        const uid = activeUserIdRef.current;
        setAllUserData(prev => {
            const nextState = {
                ...prev,
                [uid]: {
                    ...(prev[uid] || {}),
                    weeklySchedule: { ...((prev[uid] || {}).weeklySchedule || defaultWeeklySchedule), [dayIdx.toString()]: { isOpen, slots } }
                }
            };
            allUserDataRef.current = nextState;
            return nextState;
        });
        set(ref(db, `loading/userData/${uid}/weeklySchedule/${dayIdx}`), { isOpen, slots }).catch(console.error);
    };

    const applyScheduleToAllDays = () => {
        if (confirm(`Θέλετε σίγουρα να αντιγράψετε το μόνιμο ωράριο της ${shortDays[activeSettingsDay]} σε ΟΛΕΣ τις ημέρες της εβδομάδας;`)) {
            const uid = activeUserIdRef.current;
            const currentSettings = safeGetSchedule(weeklySchedule[activeSettingsDay.toString()]);
            const newWeeklySchedule = { ...weeklySchedule };
            for (let i = 0; i < 7; i++) {
                newWeeklySchedule[i.toString()] = { isOpen: currentSettings.isOpen, slots: [...currentSettings.slots] };
            }
            
            setAllUserData(prev => {
                const nextState = {
                    ...prev,
                    [uid]: {
                        ...(prev[uid] || {}),
                        weeklySchedule: newWeeklySchedule
                    }
                };
                allUserDataRef.current = nextState;
                return nextState;
            });
            
            set(ref(db, `loading/userData/${uid}/weeklySchedule`), newWeeklySchedule).catch(console.error);
        }
    };

    const addCustomTime = (dStr: string, newTime: string) => {
        const uid = activeUserIdRef.current;
        const existing = customTimes[dStr] || [];
        if (!existing.includes(newTime)) {
            const updatedTimes = [...existing, newTime];
            setAllUserData(prev => {
                const nextState = {
                    ...prev,
                    [uid]: {
                        ...(prev[uid] || {}),
                        customTimes: { ...((prev[uid] || {}).customTimes || {}), [dStr]: updatedTimes }
                    }
                };
                allUserDataRef.current = nextState;
                return nextState;
            });
            set(ref(db, `loading/userData/${uid}/customTimes/${dStr}`), updatedTimes).catch(console.error);
        }
    };

    // --- GLOBAL SEARCH LOGIC (Συμπεριλαμβάνει και τα Μόνιμα Ραντεβού) ---
    const searchResults = useMemo(() => {
        const trimmed = searchTerm.trim();
        if (!trimmed) return [];
        const term = trimmed.toLowerCase();
        const results: any[] = [];

        Object.keys(appointments).forEach(dStr => {
            const dayObj = appointments[dStr] || {};
            Object.keys(dayObj).forEach(time => {
                const appt = dayObj[time];
                if (appt && !appt.isCancelled) {
                    if ((appt.name && appt.name.toLowerCase().includes(term)) || 
                        (appt.comment && appt.comment.toLowerCase().includes(term))) {
                        results.push({ dateStr: dStr, time, isPermanent: false, ...appt });
                    }
                }
            });
        });

        // Αναζήτηση και στα Μόνιμα ραντεβού
        for (let dIdx = 0; dIdx < 7; dIdx++) {
            const dayPermObj = { ...(permanent[dIdx] || {}), ...(permanent[`day_${dIdx}`] || {}) };
            Object.keys(dayPermObj).forEach(time => {
                const pAppt = dayPermObj[time];
                if (pAppt && pAppt.name) {
                    if (pAppt.name.toLowerCase().includes(term) || (pAppt.comment && pAppt.comment.toLowerCase().includes(term))) {
                        // Βρίσκουμε την επόμενη ημερομηνία που αντιστοιχεί σε αυτή την ημέρα της εβδομάδας
                        const nextDate = new Date(currentDateObj);
                        const diff = (dIdx - nextDate.getDay() + 7) % 7;
                        nextDate.setDate(nextDate.getDate() + diff);
                        const nextDateStr = formatDateStr(nextDate);
                        results.push({
                            dateStr: nextDateStr,
                            time,
                            isPermanent: true,
                            dayLabel: `Κάθε ${shortDays[dIdx]}`,
                            ...pAppt
                        });
                    }
                }
            });
        }

        return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time));
    }, [appointments, permanent, searchTerm, currentDateObj]);

    // --- WEEKLY FREE SLOTS LOGIC ---
    const weeklyFreeSlots = useMemo(() => {
        if (!showOnlyFree) return [];
        const freeDays = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(currentDateObj);
            d.setDate(d.getDate() + i);
            const dStr = formatDateStr(d);
            const dDay = d.getDay();
            
            const daySch = safeGetSchedule(schedulesMap[dStr], weeklySchedule[dDay.toString()]);
            if (!daySch.isOpen) continue;

            const cTimes = customTimes[dStr] || [];
            const allT = Array.from(new Set([...daySch.slots, ...cTimes])).sort();
            
            const dayFree = allT.filter((t: string) => {
                const appt = appointments[dStr]?.[t];
                const perm = permanent[`day_${dDay}`]?.[t] || permanent[dDay.toString()]?.[t];
                const isCancelled = appt ? !!appt.isCancelled : false;
                const nameVal = appt ? (appt.name || '') : (perm ? perm.name || '' : '');
                const isBreak = nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' || fixedBreaks.includes(t);
                const isBooked = nameVal !== '' && !isCancelled && !isBreak;
                return !isBooked && !isBreak;
            });

            if (dayFree.length > 0) {
                freeDays.push({ dateObj: d, dateStr: dStr, slots: dayFree });
            }
        }
        return freeDays;
    }, [showOnlyFree, currentDateObj, schedulesMap, weeklySchedule, customTimes, appointments, permanent, fixedBreaks]);

    // --- DAILY NORMAL SLOTS (Υποστηρίζει δυναμική διάρκεια και στα Μόνιμα του Γκεστ) ---
    const allTimes = useMemo(() => {
        if (!currentDaySchedule.isOpen) return []; 
        const baseSlots = currentDaySchedule.slots || [];
        const customTimesForDay = customTimes[dateStr] || [];
        const bookedTimes = Object.keys(appointments[dateStr] || {}).filter(t => !appointments[dateStr][t]?.isCancelled);
        const permForDay = { ...(permanent[dayOfWeek] || {}), ...(permanent[`day_${dayOfWeek}`] || {}) };
        const permTimes = Object.keys(permForDay).filter(t => !appointments[dateStr]?.[t]?.isCancelled && permForDay[t]?.name);

        let combined = Array.from(new Set([...baseSlots, ...customTimesForDay, ...bookedTimes, ...permTimes])).sort((a, b) => a.localeCompare(b));

        // Αν είμαστε στον Γκεστ, εφαρμόζουμε τη διάρκεια και για τα μόνιμα ραντεβού κάθε εβδομάδας
        if (activeUserId === 'guest') {
            const maxSlotStr = [...baseSlots].sort().pop() || "21:30";
            const extraEndSlots: string[] = [];
            const blockedRanges: Array<{ start: string; end: string }> = [];

            combined.forEach((t: string) => {
                const appt = appointments[dateStr]?.[t];
                const perm = permForDay[t];
                const active = appt && !appt.isCancelled ? appt : (!appt?.isCancelled && perm ? perm : null);

                if (active && active.name && active.name !== 'ΔΙΑΛΕΙΜΜΑ' && active.name !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' && active.duration) {
                    const [hStr, mStr] = t.split(':');
                    const startMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
                    const endMins = startMins + Number(active.duration);
                    const endH = Math.floor(endMins / 60);
                    const endM = endMins % 60;
                    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                    blockedRanges.push({ start: t, end: endTimeStr });
                    if (endTimeStr <= maxSlotStr) {
                        extraEndSlots.push(endTimeStr);
                    }
                }
            });

            combined = Array.from(new Set([...combined, ...extraEndSlots]))
                .filter((slot: string) => {
                    const hasAppt = (appointments[dateStr]?.[slot] && !appointments[dateStr][slot]?.isCancelled && appointments[dateStr][slot]?.name) ||
                                    (!appointments[dateStr]?.[slot]?.isCancelled && permForDay[slot]?.name);
                    if (hasAppt) return true;
                    return !blockedRanges.some(r => slot > r.start && slot < r.end);
                })
                .sort((a, b) => a.localeCompare(b));
        }

        return combined;
    }, [currentDaySchedule, dateStr, customTimes, appointments, permanent, dayOfWeek, activeUserId]);

    const stats = useMemo(() => {
        let total = 0, done = 0;
        const appsList: any[] = [];
        allTimes.forEach(time => {
            const appt = appointments[dateStr]?.[time];
            const perm = permanent[`day_${dayOfWeek}`]?.[time] || permanent[dayOfWeek]?.[time];
            const isCancelled = appt ? !!appt.isCancelled : false;
            
            const nameVal = !isCancelled ? (appt?.name || perm?.name || '') : '';
            const isComp = appt ? !!appt.isCompleted : false;

            if (nameVal && nameVal !== 'ΔΙΑΛΕΙΜΜΑ' && nameVal !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ') {
                total++;
                if (isComp) done++;
                appsList.push({ time, name: nameVal, isComp, isPerm: !!(perm && perm.name) });
            }
        });
        return { total, done, appsList };
    }, [allTimes, appointments, permanent, dateStr, dayOfWeek]);

    const scrollToAppointment = (time: string) => {
        const element = document.getElementById(`appointment-${time}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedId(time);
            setIsOverviewOpen(false);
            setTimeout(() => setHighlightedId(null), 2000);
        }
    };

    if (!isClient) return null;

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-5 bg-black">
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 w-full max-w-sm text-center shadow-2xl relative z-10">
                    <div className="flex flex-col items-center justify-center mb-10 w-full">
                        <h1 className="m-0 text-white text-4xl font-black tracking-tighter">RELOAD</h1>
                        <p className="text-zinc-500 text-[0.65rem] tracking-[6px] uppercase mt-2 font-bold m-0">Συστημα Διαχειρισης</p>
                    </div>

                    <input 
                        type="password" 
                        value={pinInput} 
                        onChange={e => setPinInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                        className="w-full bg-black border border-zinc-800 text-white rounded-xl p-4 text-3xl text-center mb-6 outline-none tracking-[20px] font-medium focus:border-white transition-colors" 
                        maxLength={4} 
                        placeholder="••••" 
                    />
                    <button
                        type="button"
                        className="w-full bg-white text-black rounded-xl p-4 text-sm font-extrabold uppercase tracking-widest cursor-pointer transition-colors hover:bg-zinc-200"
                        onClick={handleLogin}
                    >
                        ΕΙΣΟΔΟΣ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-[100dvh] text-zinc-300 font-sans overflow-x-hidden antialiased select-none pb-[calc(4rem+env(safe-area-inset-bottom))] bg-black">
            
            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col pt-6 sm:pt-12 px-3 sm:px-6">
                
                {/* Navigation & Header */}
                <nav className="flex flex-col gap-3 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start justify-center ml-2">
                            <span className="text-white text-2xl font-black tracking-tight">RELOAD</span>
                            <span className="text-zinc-500 text-[0.6rem] tracking-[4px] font-bold uppercase mt-1">Πινακας Ελεγχου</span>
                        </div>
                        <button
                            type="button"
                            className="bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-bold transition-colors hover:bg-zinc-800 hover:text-white"
                            onClick={handleLogout}
                        >
                            ΕΞΟΔΟΣ
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto mt-2 pt-3 border-t border-zinc-800 pb-1 [&::-webkit-scrollbar]:hidden">
                        {usersList.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => setActiveUserId(u.id)}
                                className={`flex items-center gap-1 whitespace-nowrap pl-4 pr-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                                    activeUserId === u.id
                                        ? 'bg-white text-black border-white'
                                        : 'bg-black text-zinc-400 border-zinc-800 hover:bg-zinc-900 hover:text-white'
                                }`}
                            >
                                <span>{u.name}</span>
                                {activeUserId === u.id && u.id !== 'guest' && (
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.name); }} 
                                        className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-black/15 text-black hover:bg-red-600 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setActiveModal('ADD_USER')}
                            className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-colors bg-black text-zinc-400 border border-zinc-700 border-dashed hover:border-white hover:text-white"
                        >
                            + ΝΕΟΣ
                        </button>
                    </div>

                    <div className="flex gap-1.5 bg-black p-1.5 rounded-xl mt-2 border border-zinc-800 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('appointments'); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
                                activeTab === 'appointments'
                                    ? 'bg-zinc-900 text-white border-zinc-700'
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-white'
                            }`}
                        >
                            Ραντεβού
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('schedule'); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
                                activeTab === 'schedule'
                                    ? 'bg-zinc-900 text-white border-zinc-700'
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-white'
                            }`}
                        >
                            Ημέρα
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('settings'); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-colors cursor-pointer ${
                                activeTab === 'settings'
                                    ? 'bg-zinc-900 text-white border-zinc-700'
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-white'
                            }`}
                        >
                            Ρυθμίσεις
                        </button>
                    </div>

                    {activeTab === 'appointments' && (
                        <div className="flex gap-2 mt-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setShowOnlyFree(false); }}
                                    className="w-full bg-black border border-zinc-800 rounded-xl text-white py-3 pr-9 pl-9 text-sm outline-none placeholder:text-zinc-600 focus:border-white transition-colors" 
                                    placeholder="Αναζήτηση παντού..." 
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            <button 
                                type="button"
                                onClick={() => { setShowOnlyFree(!showOnlyFree); setSearchTerm(''); }}
                                className={`rounded-xl px-4 font-bold text-xs uppercase tracking-widest transition-colors border ${
                                    showOnlyFree
                                        ? 'bg-white text-black border-white'
                                        : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
                                }`}
                            >
                                ΕΛΕΥΘΕΡΑ
                            </button>
                        </div>
                    )}
                </nav>

                {/* OVERRIDE VIEWS (Search & Free Slots) */}
                {searchTerm.trim() !== '' && activeTab === 'appointments' ? (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest ml-2">Αποτελέσματα Αναζήτησης</h2>
                        {searchResults.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 text-sm font-bold bg-zinc-950 rounded-xl border border-zinc-800">Δεν βρέθηκαν ραντεβού.</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {searchResults.map((res, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { setCurrentDateObj(new Date(res.dateStr)); setSearchTerm(''); }}
                                        className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 cursor-pointer hover:border-white/50 transition-colors flex flex-col gap-2"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-white font-bold text-sm">
                                                {res.isPermanent ? `${res.dayLabel} (${formatGreekDate(res.dateStr)})` : formatGreekDate(res.dateStr)} - {res.time}
                                            </span>
                                            <span className={`text-[0.6rem] font-bold px-2 py-1 rounded-md ${
                                                res.isPermanent
                                                    ? 'bg-white text-black'
                                                    : res.isCompleted
                                                    ? 'bg-zinc-800 text-zinc-500'
                                                    : 'bg-zinc-800 text-white border border-zinc-600'
                                            }`}>
                                                {res.isPermanent ? '↻ ΜΟΝΙΜΟ' : res.isCompleted ? 'ΟΛΟΚΛΗΡΩΜΕΝΟ' : 'ΕΝΕΡΓΟ'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className={`font-black text-lg ${res.isCompleted ? 'text-zinc-600 line-through' : 'text-zinc-200'}`}>{res.name}</div>
                                            {res.comment && <div className="text-zinc-500 text-sm">{res.comment}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : showOnlyFree && activeTab === 'appointments' ? (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest ml-2">Ελεύθερα (Επόμενες 7 Ημέρες)</h2>
                        {weeklyFreeSlots.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500 text-sm font-bold bg-zinc-950 rounded-xl border border-zinc-800">Δεν υπάρχουν ελεύθερες ώρες.</div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {weeklyFreeSlots.map(day => (
                                    <div key={day.dateStr} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                                        <h3 className="text-white font-bold mb-4 capitalize">{formatGreekDate(day.dateStr)}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {day.slots.map((s: string) => (
                                                <button
                                                    type="button"
                                                    key={s}
                                                    onClick={() => { setCurrentDateObj(day.dateObj); setShowOnlyFree(false); }}
                                                    className="px-3 py-2 rounded-xl text-sm font-bold bg-black text-zinc-300 border border-zinc-800 hover:border-white hover:text-white transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* NORMAL DAILY CALENDAR VIEW */}
                        {activeTab !== 'settings' && (
                            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-3 mb-4">
                                <div className="flex justify-between items-center px-1">
                                    <h3 className="text-base font-bold text-white m-0 uppercase tracking-wide">
                                        {monthsGreek[currentDateObj.getMonth()]} {currentDateObj.getFullYear()}
                                    </h3>
                                    <div className="relative w-8 h-8 shrink-0">
                                        <div className="w-full h-full bg-zinc-900 border border-zinc-700 rounded-lg flex justify-center items-center text-white text-lg">📅</div>
                                        <input
                                            type="date"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            value={formatDateStr(currentDateObj)}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setCurrentDateObj(new Date(e.target.value));
                                                    setIsOverviewOpen(false);
                                                    setSearchTerm('');
                                                    setShowOnlyFree(false);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                                    {Array.from({ length: 15 }).map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - 2 + i);
                                        const checkStr = formatDateStr(d);
                                        const isSelected = checkStr === dateStr;
                                        const isSunday = d.getDay() === 0;
                                        const isToday = checkStr === formatDateStr(new Date());
                                        return (
                                            <button
                                                type="button"
                                                key={i}
                                                className={`min-w-[62px] flex flex-col items-center justify-center p-2.5 rounded-xl cursor-pointer shrink-0 transition-colors border ${
                                                    isSelected
                                                        ? 'bg-white text-black border-white'
                                                        : 'bg-black border-zinc-800 hover:bg-zinc-900'
                                                } ${isToday && !isSelected ? 'border-zinc-500' : ''}`}
                                                onClick={() => {
                                                    setCurrentDateObj(d);
                                                    setIsOverviewOpen(false);
                                                    setSearchTerm('');
                                                    setShowOnlyFree(false);
                                                }}
                                            >
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-wider mb-0.5 ${
                                                    isSelected ? 'text-black' : isSunday ? 'text-red-500' : 'text-zinc-500'
                                                }`}>
                                                    {shortDays[d.getDay()]}
                                                </span>
                                                <span className={`text-2xl font-bold mb-0.5 ${isSelected ? 'text-black' : 'text-zinc-200'}`}>
                                                    {d.getDate()}
                                                </span>
                                                <span className={`text-[0.6rem] font-bold uppercase ${isSelected ? 'text-zinc-700' : 'text-zinc-600'}`}>
                                                    {shortMonths[d.getMonth()]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* --- 1. APPOINTMENTS TAB --- */}
                        {activeTab === 'appointments' && (
                            <>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsOverviewOpen(!isOverviewOpen)}
                                        className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center transition-colors hover:border-zinc-600"
                                    >
                                        <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Συνολο</span>
                                        <span className="text-3xl font-bold text-white">{!currentDaySchedule.isOpen ? '-' : stats.total}</span>
                                    </button>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center">
                                        <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Ολοκληρωμενα</span>
                                        <span className={`text-3xl font-bold ${stats.done > 0 ? 'text-white' : 'text-zinc-600'}`}>
                                            {!currentDaySchedule.isOpen ? '-' : stats.done}
                                        </span>
                                    </div>
                                </div>

                                {isOverviewOpen && (
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 space-y-2 max-h-[300px] overflow-y-auto mb-4">
                                        {stats.appsList.length === 0 ? (
                                            <div className="text-center py-4 text-xs text-zinc-500 font-medium">Καμία κράτηση.</div>
                                        ) : (
                                            stats.appsList.map(app => (
                                                <button
                                                    type="button"
                                                    key={app.time}
                                                    onClick={() => scrollToAppointment(app.time)}
                                                    className="w-full flex items-center justify-between p-3 bg-black hover:bg-zinc-900 rounded-xl transition-colors border border-zinc-800"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold text-sm">{app.time}</span>
                                                        {app.isPerm && (
                                                            <span className="text-[0.6rem] font-extrabold bg-white text-black px-1.5 py-0.5 rounded">↻ ΜΟΝΙΜΟ</span>
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-bold ${app.isComp ? 'text-zinc-600 line-through' : 'text-white'}`}>
                                                        {app.name}
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-center px-1 border-b border-zinc-800 pb-3 mb-4">
                                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest m-0">Κρατησεις</h2>
                                    {currentDaySchedule.isOpen && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors"
                                                onClick={() => setActiveModal('ADD_TIME')}
                                            >
                                                + ΩΡΑ
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    {!currentDaySchedule.isOpen ? (
                                        <div className="text-center py-10 text-zinc-500 text-sm font-bold uppercase tracking-widest bg-zinc-950 rounded-xl border border-zinc-800">
                                            ΤΟ ΚΑΤΑΣΤΗΜΑ ΕΙΝΑΙ ΚΛΕΙΣΤΟ
                                        </div>
                                    ) : allTimes.length === 0 ? (
                                        <div className="text-center py-10 text-zinc-500 text-sm font-bold bg-zinc-950 rounded-xl border border-zinc-800">
                                            Δεν υπάρχουν διαθέσιμες ώρες.
                                        </div>
                                    ) : (
                                        allTimes.map(time => {
                                            const isFixedBreak = fixedBreaks.includes(time);
                                            const appt = appointments[dateStr]?.[time];
                                            const perm = permanent[`day_${dayOfWeek}`]?.[time] || permanent[dayOfWeek]?.[time];
                                            const isCancelledToday = appt?.isCancelled === true;
                                            const hasPerm = !!(perm && perm.name);

                                            const effectiveAppt = isCancelledToday
                                                ? null
                                                : appt && appt.name
                                                ? appt
                                                : hasPerm
                                                ? {
                                                      name: perm.name,
                                                      comment: perm.comment || '',
                                                      status: appt?.status || 'APPROVED',
                                                      isCompleted: appt?.isCompleted || false,
                                                      duration: appt?.duration || perm.duration
                                                  }
                                                : null;

                                            return (
                                                <AppointmentSlot
                                                    key={`${activeUserId}-${dateStr}-${time}`}
                                                    userId={activeUserId}
                                                    dateStr={dateStr}
                                                    time={time}
                                                    activeAppt={effectiveAppt}
                                                    isPermanent={hasPerm && !isCancelledToday}
                                                    isFixedBreak={isFixedBreak}
                                                    isHighlighted={highlightedId === time}
                                                    isGuest={activeUserId === 'guest'}
                                                    onUpdate={handleSlotUpdate}
                                                    onTogglePermanent={handleTogglePermanent}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* --- 2. ΩΡΑΡΙΟ TAB (ΗΜΕΡΑΣ) --- */}
                {activeTab === 'schedule' && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-white text-base">Κατάσταση Ημέρας ({shortDays[dayOfWeek]} {currentDateObj.getDate()})</div>
                                    <div className="text-xs text-zinc-500 mt-1">Ειδικό ωράριο μόνο για αυτή την ημερομηνία.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleDayStatus}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        currentDaySchedule.isOpen ? 'bg-white border border-white' : 'bg-zinc-800 border border-zinc-700'
                                    }`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-zinc-900 transition-transform ${
                                        currentDaySchedule.isOpen ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5">
                            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-4">
                                <h2 className="text-sm font-bold text-white tracking-wide m-0">Διαθέσιμες Ώρες</h2>
                                <div className={`flex gap-2 ${!currentDaySchedule.isOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <button
                                        type="button"
                                        onClick={resetToDefaultSlots}
                                        className="text-xs px-3 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold transition-colors"
                                    >
                                        Επαναφορά
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllSlots}
                                        className="text-xs px-3 py-2 bg-red-950/30 text-red-500 border border-red-900/50 rounded-xl font-bold transition-colors hover:bg-red-900/50"
                                    >
                                        Καθαρ.
                                    </button>
                                </div>
                            </div>

                            {!currentDaySchedule.isOpen ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-sm font-bold bg-black rounded-xl border border-zinc-800">
                                    Το κατάστημα είναι κλειστό.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1">
                                    {allPossibleSlots.map(slot => {
                                        const isActive = currentDaySchedule.slots.includes(slot);
                                        return (
                                            <button
                                                type="button"
                                                key={slot}
                                                onClick={() => toggleSpecificSlot(slot)}
                                                className={`w-full flex items-center justify-between py-3.5 px-5 rounded-xl transition-colors ${
                                                    isActive
                                                        ? 'bg-zinc-900 border border-white/60 text-white font-bold'
                                                        : 'bg-black text-zinc-500 border border-zinc-800 hover:bg-zinc-900'
                                                }`}
                                            >
                                                <span className="text-base font-bold tracking-wider">{slot}</span>
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                                                    {isActive ? 'ΕΝΕΡΓΗ' : 'ΚΛΕΙΔΩΜΕΝΗ'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- 3. ΡΥΘΜΙΣΕΙΣ TAB (ΕΒΔΟΜΑΔΙΑΙΟ ΩΡΑΡΙΟ) --- */}
                {activeTab === 'settings' && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-3">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest m-0 ml-1">Εβδομαδιαιο Ωραριο</h2>
                            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                    const isSelected = activeSettingsDay === dayIdx;
                                    return (
                                        <button
                                            type="button"
                                            key={dayIdx}
                                            onClick={() => setActiveSettingsDay(dayIdx)}
                                            className={`flex-1 min-w-[50px] py-3 rounded-xl font-bold text-xs uppercase transition-colors border ${
                                                isSelected
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-black border-zinc-800 text-zinc-500 hover:bg-zinc-900'
                                            }`}
                                        >
                                            {shortDays[dayIdx]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-white text-base">Γενικός Κανόνας ({shortDays[activeSettingsDay]})</div>
                                    <div className="text-xs text-zinc-500 mt-1">Εφαρμόζεται σε όλες τις εβδομάδες.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => saveWeeklySchedule(activeSettingsDay, !settingsDaySchedule.isOpen, settingsDaySchedule.slots)}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                                        settingsDaySchedule.isOpen ? 'bg-white border border-white' : 'bg-zinc-800 border border-zinc-700'
                                    }`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-zinc-900 transition-transform ${
                                        settingsDaySchedule.isOpen ? 'translate-x-7' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5">
                            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-4">
                                <h2 className="text-sm font-bold text-white tracking-wide m-0">Μόνιμες Ώρες</h2>
                                <div className={`flex gap-2 ${!settingsDaySchedule.isOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <button
                                        type="button"
                                        onClick={() => saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, defaultScheduleSlots)}
                                        className="text-xs px-3 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold transition-colors"
                                    >
                                        Επαναφορά
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, [])}
                                        className="text-xs px-3 py-2 bg-red-950/30 text-red-500 border border-red-900/50 rounded-xl font-bold transition-colors hover:bg-red-900/50"
                                    >
                                        Καθαρ.
                                    </button>
                                </div>
                            </div>

                            {!settingsDaySchedule.isOpen ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-sm font-bold bg-black rounded-xl border border-zinc-800">
                                    Η ημέρα είναι προεπιλεγμένη ως Κλειστή.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1">
                                    {allPossibleSlots.map(slot => {
                                        const isActive = settingsDaySchedule.slots.includes(slot);
                                        return (
                                            <button
                                                type="button"
                                                key={slot}
                                                onClick={() => {
                                                    const updated = isActive
                                                        ? settingsDaySchedule.slots.filter((s: string) => s !== slot)
                                                        : [...settingsDaySchedule.slots, slot].sort();
                                                    saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, updated);
                                                }}
                                                className={`w-full flex items-center justify-between py-3.5 px-5 rounded-xl transition-colors ${
                                                    isActive
                                                        ? 'bg-zinc-900 border border-white/60 text-white font-bold'
                                                        : 'bg-black text-zinc-500 border border-zinc-800 hover:bg-zinc-900'
                                                }`}
                                            >
                                                <span className="text-base font-bold tracking-wider">{slot}</span>
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                                                    {isActive ? 'ΕΝΕΡΓΗ' : 'ΚΛΕΙΔΩΜΕΝΗ'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Μαζική Εφαρμογή */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div>
                                    <h2 className="text-sm font-bold text-white tracking-wide m-0">Μαζική Εφαρμογή</h2>
                                    <p className="text-xs text-zinc-500 mt-1 mb-0">
                                        Αντιγραφή του ωραρίου της <strong>{shortDays[activeSettingsDay]}</strong> σε όλες τις υπόλοιπες ημέρες.
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={applyScheduleToAllDays} 
                                    className="w-full sm:w-auto text-xs px-4 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-widest transition-colors"
                                >
                                    ΟΛΕΣ ΟΙ ΜΕΡΕΣ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {activeModal === 'ADD_TIME' && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center overflow-hidden p-0 m-0"
                    onClick={(e) => e.target === e.currentTarget && setActiveModal('NONE')}
                >
                    <div className="bg-zinc-950 w-full max-w-lg p-6 rounded-t-3xl border-t border-zinc-700 flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-sm font-bold text-white tracking-wide uppercase">Εκτακτη Ωρα</h3>
                            <button
                                type="button"
                                className="bg-zinc-900 border border-zinc-700 rounded-full w-9 h-9 flex items-center justify-center text-zinc-400 font-bold hover:text-white"
                                onClick={() => setActiveModal('NONE')}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex justify-center items-center gap-3">
                            <select
                                value={customH}
                                onChange={e => setCustomH(e.target.value)}
                                className="flex-1 bg-black border border-zinc-800 text-white font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none focus:border-white"
                            >
                                {Array.from({ length: 17 }, (_, i) => String(i + 7).padStart(2, '0')).map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                            <span className="text-2xl font-bold text-zinc-600">:</span>
                            <select
                                value={customM}
                                onChange={e => setCustomM(e.target.value)}
                                className="flex-1 bg-black border border-zinc-800 text-white font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none focus:border-white"
                            >
                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            className="w-full bg-white text-black hover:bg-zinc-200 font-extrabold py-4 rounded-2xl tracking-widest uppercase transition-colors"
                            onClick={() => {
                                const newTime = `${customH}:${customM}`;
                                addCustomTime(dateStr, newTime);
                                setActiveModal('NONE');
                            }}
                        >
                            ΠΡΟΣΘΗΚΗ ΩΡΑΣ
                        </button>
                    </div>
                </div>
            )}

            {activeModal === 'ADD_USER' && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center overflow-hidden p-0 m-0"
                    onClick={(e) => e.target === e.currentTarget && setActiveModal('NONE')}
                >
                    <div className="bg-zinc-950 w-full max-w-lg p-6 rounded-t-3xl border-t border-zinc-700 flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-sm font-bold text-white tracking-wide uppercase">Νεος Χρηστης</h3>
                            <button
                                type="button"
                                className="bg-zinc-900 border border-zinc-700 rounded-full w-9 h-9 flex items-center justify-center text-zinc-400 font-bold hover:text-white"
                                onClick={() => setActiveModal('NONE')}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                value={newUserName} 
                                onChange={e => setNewUserName(e.target.value)} 
                                placeholder="Όνομα (π.χ. Άρης, Αντώνης)..." 
                                className="w-full bg-black border border-zinc-800 text-white font-bold text-lg p-4 rounded-2xl outline-none focus:border-white transition-colors"
                            />
                        </div>
                        <button
                            type="button"
                            className="w-full bg-white text-black hover:bg-zinc-200 font-extrabold py-4 rounded-2xl tracking-widest uppercase transition-colors"
                            onClick={handleAddUser}
                        >
                            ΠΡΟΣΘΗΚΗ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}