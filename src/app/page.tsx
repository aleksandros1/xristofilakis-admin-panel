"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

const defaultWeeklySchedule = Array.from({length: 7}).reduce((acc: Record<string, { isOpen: boolean, slots: string[] }>, _, i) => {
    acc[i.toString()] = { isOpen: i !== 0, slots: defaultScheduleSlots };
    return acc;
}, {});

// Σταθερές αναφορές
const EMPTY_OBJ = {};
const EMPTY_ARR: string[] = [];

// --- Types ---
type AppointmentSlotProps = {
    time: string;
    activeAppt: any;
    isFixedBreak: boolean;
    isHighlighted: boolean;
    onUpdate: (payload: any) => void;
};

// --- Helpers ---
const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// --- Component για κάθε Ραντεβού ---
function AppointmentSlot({ time, activeAppt, isFixedBreak, isHighlighted, onUpdate }: AppointmentSlotProps) {
    const [localName, setLocalName] = useState(activeAppt?.name || '');
    const [localComment, setLocalComment] = useState(activeAppt?.comment || '');
    const [confirmCancel, setConfirmCancel] = useState(false);

    useEffect(() => { setLocalName(activeAppt?.name || ''); }, [activeAppt?.name]);
    useEffect(() => { setLocalComment(activeAppt?.comment || ''); }, [activeAppt?.comment]);

    let nameVal = activeAppt?.name || '';
    let status = activeAppt?.status || 'PENDING';
    let isCompleted = activeAppt?.isCompleted || false;

    if (!nameVal && isFixedBreak) nameVal = 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ';

    // Dark White-Neon Styling
    let cardClass = 'bg-zinc-900/60 border-zinc-800 shadow-[0_4px_24px_rgba(0,0,0,0.5)]';
    let indicatorClass = 'bg-zinc-600 border border-zinc-500 shadow-[0_0_8px_rgba(255,255,255,0.1)]';
    let inputColorClass = 'text-white';
    
    if (nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ') {
        cardClass = 'bg-red-950/20 border-red-900/50 shadow-sm';
        indicatorClass = 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] border-red-400';
        inputColorClass = 'text-red-400';
    } else if (nameVal) {
        if (status === 'PENDING') {
            indicatorClass = 'bg-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.3)] border-zinc-300';
            inputColorClass = 'text-zinc-300';
        }
        if (status === 'APPROVED') {
            indicatorClass = 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] border-white';
            inputColorClass = 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]';
        }
        if (isCompleted) {
            cardClass = 'bg-zinc-950/60 border-zinc-900 shadow-sm opacity-70';
            indicatorClass = 'bg-zinc-600 shadow-[0_0_10px_rgba(255,255,255,0.1)] border-zinc-500';
            inputColorClass = 'text-zinc-600 line-through';
        }
    }

    const showDetails = (localName || nameVal) && nameVal !== 'ΔΙΑΛΕΙΜΜΑ' && nameVal !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ';

    return (
        <div id={`appointment-${time}`} className={`flex flex-col backdrop-blur-xl border rounded-[1.25rem] p-4 transition-all duration-300 ${cardClass} ${isHighlighted ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.01]' : ''}`}>
            <div className="flex gap-4">
                <div className="flex flex-col items-center justify-start mt-1 shrink-0 w-[50px]">
                    <span className={`text-xl font-black tracking-tight drop-shadow-md ${nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}>{time}</span>
                </div>
                <div className={`w-1.5 rounded-full shrink-0 ${indicatorClass}`}></div>
                
                <div className="flex-1 py-1 min-w-0 flex flex-col gap-2">
                    <input type="text" className={`w-full bg-transparent border-none outline-none font-bold text-lg p-0 placeholder:font-normal placeholder:text-zinc-600 transition-all drop-shadow-sm ${inputColorClass}`}
                        value={nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' ? nameVal : localName} 
                        placeholder="Όνομα πελάτη..." 
                        readOnly={nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ'}
                        onChange={e => setLocalName(e.target.value)} 
                        onBlur={() => { if (localName !== (activeAppt?.name || '')) onUpdate({ name: localName, status: status }) }}
                    />
                    {showDetails && (
                        <input type="text" className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors shadow-inner ${isCompleted ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 line-through' : 'bg-black/40 border-zinc-700/50 text-zinc-300 focus:bg-black/60 focus:border-white/60 focus:shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`}
                            value={localComment} 
                            placeholder="Σχόλιο / Λεπτομέρειες..." 
                            onChange={e => setLocalComment(e.target.value)} 
                            onBlur={() => { if (localComment !== (activeAppt?.comment || '')) onUpdate({ comment: localComment }) }}
                        />
                    )}
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-800/80 h-[53px]">
                {confirmCancel ? (
                    <div className="flex items-center justify-between w-full animate-slideUp">
                        <span className="text-[0.7rem] font-bold text-red-500 ml-1 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Σιγουρα;</span>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmCancel(false)} className="px-4 h-[40px] flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs shadow-sm hover:bg-zinc-700 hover:text-white transition-all active:scale-95 border border-zinc-600">ΑΚΥΡΟ</button>
                            <button onClick={() => { onUpdate({ isCancelled: true, name: '' }); setConfirmCancel(false); }} className="px-4 h-[40px] flex items-center justify-center rounded-xl bg-red-600/20 text-red-500 border border-red-500 font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:bg-red-500 hover:text-white transition-all active:scale-95">ΔΙΑΓΡΑΦΗ</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button onClick={() => onUpdate({ status: status === 'APPROVED' ? 'PENDING' : 'APPROVED' })} className={`w-[40px] h-[40px] flex items-center justify-center rounded-xl border transition-all shadow-sm active:scale-95 ${status === 'APPROVED' ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-white hover:border-white/80 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`}>✓</button>
                        <button onClick={() => onUpdate({ isCompleted: !isCompleted })} className={`w-[40px] h-[40px] flex items-center justify-center rounded-xl border transition-all shadow-sm active:scale-95 ${isCompleted ? 'bg-zinc-700/50 border-zinc-500 text-zinc-200 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`}>✔</button>
                        <button onClick={() => onUpdate({ name: 'ΔΙΑΛΕΙΜΜΑ', comment: '' })} className="w-[40px] h-[40px] flex items-center justify-center rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-400 shadow-sm hover:text-white hover:border-zinc-500 transition-all active:scale-95">॥</button>
                        <button onClick={() => setConfirmCancel(true)} className="w-[40px] h-[40px] flex items-center justify-center rounded-xl bg-red-950/30 border border-red-900/50 text-red-500 shadow-sm hover:bg-red-500/20 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)] transition-all active:scale-95">✕</button>
                    </>
                )}
            </div>
        </div>
    );
}

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

    const currentUserData = allUserData[activeUserId] || EMPTY_OBJ;
    const appointments = currentUserData.appointments || EMPTY_OBJ;
    const permanent = currentUserData.permanent || EMPTY_OBJ;
    const customTimes = currentUserData.customTimes || EMPTY_OBJ;
    const fixedBreaks = currentUserData.fixedBreaks || EMPTY_ARR;
    const schedulesMap = currentUserData.schedulesMap || EMPTY_OBJ;
    const weeklySchedule = currentUserData.weeklySchedule || defaultWeeklySchedule;

    const currentDaySchedule = schedulesMap[dateStr] || weeklySchedule[dayOfWeek.toString()] || { isOpen: true, slots: defaultScheduleSlots };
    const settingsDaySchedule = weeklySchedule[activeSettingsDay.toString()] || { isOpen: true, slots: defaultScheduleSlots };

    const [activeModal, setActiveModal] = useState<'NONE' | 'ADD_TIME' | 'ADD_USER'>('NONE');
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [isAddingAppointment, setIsAddingAppointment] = useState(false);
    const [newAppForm, setNewAppForm] = useState({ name: '', comment: '', time: '', service: 'Υπηρεσία' });
    
    const [customH, setCustomH] = useState('12');
    const [customM, setCustomM] = useState('00');

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

            let loadedUserData = data.userData;
            if (!loadedUserData && (data.appointments || data.schedulesMap || data.customTimes || data.weeklySchedule)) {
                loadedUserData = {
                    guest: {
                        appointments: data.appointments || {},
                        schedulesMap: data.schedulesMap || {},
                        customTimes: data.customTimes || {},
                        fixedBreaks: data.fixedBreaks || [],
                        weeklySchedule: data.weeklySchedule || defaultWeeklySchedule
                    }
                };
            } else {
                loadedUserData = loadedUserData || {};
            }
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
        
        set(ref(db, 'loading/usersList'), newUsersList).then(() => {
            setActiveUserId(newId);
            setActiveModal('NONE');
            setNewUserName('');
        });
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

    const updateAppt = (dStr: string, time: string, payload: any) => {
        const currentAppt = appointments[dStr]?.[time] || {};
        const updatedAppt = { ...currentAppt, ...payload };
        
        setAllUserData(prev => {
            const userSpecific = prev[activeUserId] || {};
            const userAppts = userSpecific.appointments || {};
            const dayAppts = userAppts[dStr] || {};
            
            let newDayAppts = { ...dayAppts };
            if (payload.isCancelled) delete newDayAppts[time];
            else newDayAppts[time] = updatedAppt;
            
            return {
                ...prev,
                [activeUserId]: { ...userSpecific, appointments: { ...userAppts, [dStr]: newDayAppts } }
            };
        });

        const apptRef = ref(db, `loading/userData/${activeUserId}/appointments/${dStr}/${time}`);
        if (payload.isCancelled) remove(apptRef).catch(console.error);
        else set(apptRef, updatedAppt).catch(console.error);
    };

    // ΩΡΑΡΙΟ ΣΥΓΚΕΚΡΙΜΕΝΗΣ ΗΜΕΡΑΣ
    const saveDailySchedule = (isOpen: boolean, slots: string[]) => {
        setAllUserData(prev => ({
            ...prev,
            [activeUserId]: {
                ...(prev[activeUserId] || {}),
                schedulesMap: { ...((prev[activeUserId] || {}).schedulesMap || {}), [dateStr]: { isOpen, slots } }
            }
        }));
        set(ref(db, `loading/userData/${activeUserId}/schedulesMap/${dateStr}`), { isOpen, slots }).catch(console.error);
    };

    const toggleDayStatus = () => {
        const newStatus = !currentDaySchedule.isOpen;
        saveDailySchedule(newStatus, currentDaySchedule.slots);
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

    // ΡΥΘΜΙΣΕΙΣ (ΜΟΝΙΜΟ ΕΒΔΟΜΑΔΙΑΙΟ ΩΡΑΡΙΟ)
    const saveWeeklySchedule = (dayIdx: number, isOpen: boolean, slots: string[]) => {
        setAllUserData(prev => ({
            ...prev,
            [activeUserId]: {
                ...(prev[activeUserId] || {}),
                weeklySchedule: { ...((prev[activeUserId] || {}).weeklySchedule || defaultWeeklySchedule), [dayIdx.toString()]: { isOpen, slots } }
            }
        }));
        set(ref(db, `loading/userData/${activeUserId}/weeklySchedule/${dayIdx}`), { isOpen, slots }).catch(console.error);
    };

    const applyScheduleToAllDays = () => {
        if (confirm(`Θέλετε σίγουρα να αντιγράψετε το ωράριο της ${shortDays[activeSettingsDay]} σε ΟΛΕΣ τις ημέρες της εβδομάδας;`)) {
            const currentSettings = weeklySchedule[activeSettingsDay.toString()] || { isOpen: true, slots: defaultScheduleSlots };
            const newWeeklySchedule = { ...weeklySchedule };
            
            for (let i = 0; i < 7; i++) {
                newWeeklySchedule[i.toString()] = { isOpen: currentSettings.isOpen, slots: [...currentSettings.slots] };
            }
            
            setAllUserData(prev => ({
                ...prev,
                [activeUserId]: {
                    ...(prev[activeUserId] || {}),
                    weeklySchedule: newWeeklySchedule
                }
            }));
            
            set(ref(db, `loading/userData/${activeUserId}/weeklySchedule`), newWeeklySchedule).catch(console.error);
        }
    };

    const addCustomTime = (dStr: string, newTime: string) => {
        const existing = customTimes[dStr] || [];
        if (!existing.includes(newTime)) {
            const updatedTimes = [...existing, newTime];
            setAllUserData(prev => ({
                ...prev,
                [activeUserId]: {
                    ...(prev[activeUserId] || {}),
                    customTimes: { ...((prev[activeUserId] || {}).customTimes || {}), [dStr]: updatedTimes }
                }
            }));
            set(ref(db, `loading/userData/${activeUserId}/customTimes/${dStr}`), updatedTimes).catch(console.error);
        }
    };

    const handleCreateAppointment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppForm.time) { alert('Επιλέξτε ώρα.'); return; }

        updateAppt(dateStr, newAppForm.time, {
            name: newAppForm.name.trim() || 'Walk-in',
            comment: newAppForm.comment.trim() || '-',
            service: newAppForm.service,
            status: 'APPROVED',
            isCompleted: false
        });

        if (!(currentDaySchedule.slots || []).includes(newAppForm.time)) {
            addCustomTime(dateStr, newAppForm.time);
        }

        setIsAddingAppointment(false);
        setNewAppForm({ name: '', comment: '', time: '', service: 'Υπηρεσία' });
    };

    const allTimes = useMemo(() => {
        if (!currentDaySchedule.isOpen) return []; 
        let baseSlots = currentDaySchedule.slots || [];
        let customTimesForDay = customTimes[dateStr] || [];
        let bookedTimes = Object.keys(appointments[dateStr] || {}).filter(t => !appointments[dateStr][t]?.isCancelled);
        return Array.from(new Set([...baseSlots, ...customTimesForDay, ...bookedTimes])).sort((a, b) => a.localeCompare(b));
    }, [currentDaySchedule, dateStr, customTimes, appointments]);

    const displayedTimes = useMemo(() => {
        return allTimes.filter(time => {
            const appt = appointments[dateStr]?.[time];
            const perm = permanent[`day_${dayOfWeek}`]?.[time] || permanent[dayOfWeek]?.[time];
            
            let nameVal = appt ? (appt.name || '') : (perm ? perm.name || '' : '');
            let commentVal = appt ? (appt.comment || '') : (perm ? perm.comment || '' : '');
            let isCancelled = appt ? !!appt.isCancelled : false;

            const isBreak = nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' || fixedBreaks.includes(time);
            const isBooked = nameVal !== '' && !isCancelled && !isBreak;

            if (showOnlyFree && (isBooked || isBreak)) return false;

            if (searchTerm.trim() !== '') {
                const searchLower = searchTerm.toLowerCase();
                if (!nameVal.toLowerCase().includes(searchLower) && 
                    !commentVal.toLowerCase().includes(searchLower) && 
                    !time.includes(searchLower)) return false;
            }
            return true;
        });
    }, [allTimes, appointments, permanent, dateStr, dayOfWeek, showOnlyFree, searchTerm, fixedBreaks]);

    const stats = useMemo(() => {
        let total = 0, done = 0, appsList: any[] = [];
        allTimes.forEach(time => {
            const appt = appointments[dateStr]?.[time];
            const perm = permanent[`day_${dayOfWeek}`]?.[time] || permanent[dayOfWeek]?.[time];
            
            let nameVal = appt ? (appt.name || '') : (perm ? perm.name || '' : '');
            let isComp = appt ? !!appt.isCompleted : false;

            if (nameVal && nameVal !== 'ΔΙΑΛΕΙΜΜΑ' && nameVal !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' && (!appt || !appt.isCancelled)) {
                total++;
                if (isComp) done++;
                appsList.push({ time, name: nameVal, isComp });
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
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="absolute top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-white/5 blur-[120px]"></div>
                    <div className="absolute bottom-[5%] -right-[5%] w-[50vw] h-[50vw] rounded-full bg-zinc-600/10 blur-[100px]"></div>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-3xl border border-zinc-800 rounded-3xl p-10 w-full max-w-sm text-center shadow-[0_0_50px_rgba(255,255,255,0.05)] relative z-10">
                    <div className="relative flex flex-col items-center justify-center mb-10 w-full">
                        <h1 className="relative z-10 m-0 text-white text-4xl font-black tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">LOADING</h1>
                        <p className="relative z-10 text-zinc-500 text-[0.65rem] tracking-[6px] uppercase mt-2 font-bold m-0">Συστημα Διαχειρισης</p>
                    </div>

                    <input 
                        type="password" 
                        value={pinInput} 
                        onChange={e => setPinInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                        className="w-full bg-black/50 border border-zinc-800 text-white rounded-xl p-4 text-3xl text-center mb-6 outline-none tracking-[20px] font-medium transition-all focus:border-white focus:shadow-[0_0_15px_rgba(255,255,255,0.2)] relative z-10" 
                        maxLength={4} 
                        placeholder="••••" 
                    />
                    <button className="w-full bg-transparent border border-white text-white rounded-xl p-4 text-sm font-extrabold uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] relative z-10" onClick={handleLogin}>
                        ΕΙΣΟΔΟΣ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-[100dvh] text-zinc-300 font-sans overflow-x-hidden antialiased select-none pb-[calc(4rem+env(safe-area-inset-bottom))] bg-black">
            
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-white/5 blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[20%] w-[50vw] h-[50vw] rounded-full bg-zinc-500/10 blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col pt-6 sm:pt-12 px-3 sm:px-6">
                
                {/* Navigation & Header */}
                <nav className="flex flex-col gap-3 bg-zinc-900/80 backdrop-blur-2xl p-4 rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-zinc-800 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start justify-center ml-2">
                            <span className="text-white text-2xl font-black tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">LOADING</span>
                            <span className="text-zinc-500 text-[0.6rem] tracking-[4px] font-bold uppercase mt-1">Πινακας Ελεγχου</span>
                        </div>
                        <button className="bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-bold transition-all hover:bg-zinc-700 hover:text-white hover:border-zinc-500 shadow-sm" onClick={handleLogout}>ΕΞΟΔΟΣ</button>
                    </div>

                    {/* Users Selector */}
                    <div className="flex gap-2 overflow-x-auto mt-2 pt-3 border-t border-zinc-800/80 pb-1 [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                        {usersList.map(u => (
                            <div 
                                key={u.id}
                                onClick={() => setActiveUserId(u.id)}
                                className={`flex items-center gap-1 whitespace-nowrap pl-4 pr-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${activeUserId === u.id ? 'bg-white/20 text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'bg-black/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white'}`}
                            >
                                <span>{u.name}</span>
                                {activeUserId === u.id && u.id !== 'guest' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id, u.name); }} 
                                        className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white hover:bg-white hover:text-black hover:shadow-[0_0_8px_rgba(255,255,255,0.6)] transition-all"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button 
                            onClick={() => setActiveModal('ADD_USER')}
                            className="whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-black/30 text-zinc-500 border border-zinc-700 border-dashed hover:border-white hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] active:scale-95"
                        >
                            + ΝΕΟΣ
                        </button>
                    </div>

                    <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-xl mt-3 border border-zinc-800/80 shadow-inner overflow-x-auto [&::-webkit-scrollbar]:hidden">
                        <button 
                            onClick={() => { setActiveTab('appointments'); setIsAddingAppointment(false); setIsOverviewOpen(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-all cursor-pointer ${activeTab === 'appointments' ? 'bg-white/20 text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                        >
                            Ραντεβού
                        </button>
                        <button 
                            onClick={() => { setActiveTab('schedule'); setIsAddingAppointment(false); setIsOverviewOpen(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-white/20 text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                        >
                            Ημέρα
                        </button>
                        <button 
                            onClick={() => { setActiveTab('settings'); setIsAddingAppointment(false); setIsOverviewOpen(false); }} 
                            className={`flex-1 min-w-[80px] p-2.5 rounded-lg border font-bold text-xs sm:text-sm transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-white/20 text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                        >
                            Ρυθμίσεις
                        </button>
                    </div>

                    {activeTab === 'appointments' && (
                        <div className="flex gap-2 mt-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">🔍</span>
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-800 rounded-xl text-white py-3 pr-9 pl-9 text-sm outline-none placeholder:text-zinc-600 shadow-inner focus:bg-black focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all" 
                                    placeholder="Αναζήτηση..." 
                                />
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white font-bold">✕</button>}
                            </div>
                            <button 
                                onClick={() => setShowOnlyFree(!showOnlyFree)}
                                className={`rounded-xl px-4 font-bold text-xs uppercase tracking-widest transition-all border ${showOnlyFree ? 'bg-white/20 text-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-black/40 text-zinc-500 border-zinc-800 hover:border-white/50 hover:text-white'}`}
                            >
                                ΕΛΕΥΘΕΡΑ
                            </button>
                        </div>
                    )}
                </nav>

                {/* Calendar Ribbon */}
                {activeTab !== 'settings' && (
                    <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] mb-4 animate-slideUp">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-base font-bold text-white m-0 uppercase tracking-wide">{monthsGreek[currentDateObj.getMonth()]} {currentDateObj.getFullYear()}</h3>
                            <div className="relative w-8 h-8 shrink-0">
                                <div className="w-full h-full bg-zinc-800 border border-zinc-700 rounded-lg flex justify-center items-center text-white text-lg shadow-[0_0_8px_rgba(255,255,255,0.2)]">📅</div>
                                <input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={formatDateStr(currentDateObj)} onChange={(e) => {
                                    setCurrentDateObj(new Date(e.target.value));
                                    setIsAddingAppointment(false); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false);
                                }} />
                            </div>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                            {Array.from({length: 15}).map((_, i) => {
                                let d = new Date(); d.setDate(d.getDate() - 2 + i);
                                let checkStr = formatDateStr(d);
                                let isSelected = checkStr === dateStr;
                                let isSunday = d.getDay() === 0;
                                return (
                                    <button key={i} className={`snap-center min-w-[65px] flex flex-col items-center justify-center p-2.5 rounded-xl cursor-pointer shrink-0 transition-all border ${
                                        isSelected ? 'bg-white/20 border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105' : 'bg-black/40 border-zinc-800 hover:bg-zinc-800'
                                    }`} onClick={(e) => { e.preventDefault(); setCurrentDateObj(d); setIsAddingAppointment(false); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false); }}>
                                        <span className={`text-[0.65rem] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : isSunday ? 'text-red-500' : 'text-zinc-500'}`}>{shortDays[d.getDay()]}</span>
                                        <span className={`text-2xl font-bold mb-0.5 ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{d.getDate()}</span>
                                        <span className={`text-[0.6rem] font-bold uppercase ${isSelected ? 'text-white' : 'text-zinc-600'}`}>{shortMonths[d.getMonth()]}</span>
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
                            <button onClick={() => setIsOverviewOpen(!isOverviewOpen)} className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center transition-all active:scale-95 hover:border-white/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Συνολο</span>
                                <span className="text-3xl font-bold text-white">{!currentDaySchedule.isOpen ? '-' : stats.total}</span>
                            </button>
                            <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Ολοκληρωμενα</span>
                                <span className={`text-3xl font-bold ${stats.done > 0 ? 'text-zinc-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-zinc-500'}`}>{!currentDaySchedule.isOpen ? '-' : stats.done}</span>
                            </div>
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOverviewOpen ? 'max-h-[400px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                            <div className="bg-zinc-900/90 backdrop-blur-3xl border border-white/30 rounded-2xl p-3 space-y-2 max-h-[300px] overflow-y-auto shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                {stats.appsList.length === 0 ? <div className="text-center py-4 text-xs text-zinc-500 font-medium">Καμία κράτηση.</div> : stats.appsList.map(app => (
                                    <button key={app.time} onClick={() => scrollToAppointment(app.time)} className="w-full flex items-center justify-between p-3 bg-black/50 hover:bg-zinc-800 rounded-xl transition-all active:scale-95 border border-zinc-800 shadow-sm">
                                        <span className="text-white font-bold text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{app.time}</span>
                                        <span className={`text-sm font-bold transition-all ${app.isComp ? 'text-zinc-600 line-through' : 'text-white'}`}>{app.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-1 border-b border-zinc-800 pb-3 mb-4">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest m-0 drop-shadow-sm">Κρατησεις</h2>
                            {currentDaySchedule.isOpen && (
                                <div className="flex gap-2">
                                    <button className="bg-zinc-800/80 border border-zinc-700 text-zinc-300 rounded-xl px-3 py-1.5 text-[0.7rem] font-bold hover:bg-zinc-700 hover:text-white active:scale-95 shadow-sm" onClick={() => setActiveModal('ADD_TIME')}>+ ΩΡΑ</button>
                                    <button className={`border rounded-xl px-3 py-1.5 text-[0.7rem] font-bold active:scale-95 shadow-sm transition-all ${isAddingAppointment ? 'bg-white/20 border-white text-white shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'bg-white/10 border-white/50 text-white hover:bg-white/20 hover:border-white hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]'}`} onClick={() => setIsAddingAppointment(!isAddingAppointment)}>
                                        {isAddingAppointment ? 'ΑΚΥΡΩΣΗ' : '+ ΡΑΝΤΕΒΟΥ'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isAddingAppointment && (
                            <form onSubmit={handleCreateAppointment} className="bg-zinc-900/80 border border-white/40 rounded-[1.5rem] p-5 space-y-4 mb-4 shadow-[0_0_20px_rgba(255,255,255,0.15)] animate-slideUp">
                                <div className="flex flex-col gap-2.5">
                                    <input type="text" placeholder="Όνομα πελάτη..." value={newAppForm.name} onChange={e => setNewAppForm({...newAppForm, name: e.target.value})} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all" />
                                    <input type="text" placeholder="Σχόλιο / Υπηρεσία..." value={newAppForm.comment} onChange={e => setNewAppForm({...newAppForm, comment: e.target.value})} className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-2">Επιλογη Ωρας</label>
                                    <div className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                                        {allPossibleSlots.map(slot => (
                                            <button type="button" key={slot} onClick={() => setNewAppForm({...newAppForm, time: slot})} className={`flex-none py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm ${newAppForm.time === slot ? 'bg-white border border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-black/40 text-zinc-400 border border-zinc-800 hover:border-white/50 hover:text-white'}`}>
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-transparent border border-white text-white hover:bg-white hover:text-black font-extrabold px-6 py-3.5 rounded-xl text-sm active:scale-95 transition-all shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.8)]">ΚΑΤΑΧΩΡΗΣΗ</button>
                            </form>
                        )}

                        <div className="flex flex-col gap-3">
                            {!currentDaySchedule.isOpen ? (
                                <div className="text-center py-10 text-zinc-500 text-sm font-bold uppercase tracking-widest drop-shadow-sm bg-zinc-900/40 rounded-xl backdrop-blur-md border border-zinc-800">ΤΟ ΚΑΤΑΣΤΗΜΑ ΕΙΝΑΙ ΚΛΕΙΣΤΟ</div>
                            ) : displayedTimes.length === 0 ? (
                                <div className="text-center py-10 text-zinc-500 text-sm font-bold drop-shadow-sm bg-zinc-900/40 rounded-xl backdrop-blur-md border border-zinc-800">
                                    {searchTerm || showOnlyFree ? 'Δεν βρέθηκαν αποτελέσματα με τα τρέχοντα φίλτρα.' : 'Δεν υπάρχουν διαθέσιμες ώρες.'}
                                </div>
                            ) : displayedTimes.map(time => {
                                const isFixedBreak = fixedBreaks.includes(time);
                                const appt = appointments[dateStr]?.[time];
                                const perm = permanent[`day_${dayOfWeek}`]?.[time] || permanent[dayOfWeek]?.[time];
                                return <AppointmentSlot key={time} time={time} activeAppt={appt && !appt.isCancelled ? appt : (perm ? { name: perm.name, comment: perm.comment, status: 'APPROVED', isCompleted: false } : null)} isFixedBreak={isFixedBreak} isHighlighted={highlightedId === time} onUpdate={(payload: any) => updateAppt(dateStr, time, payload)} />
                            })}
                        </div>
                    </>
                )}

                {/* --- 2. ΩΡΑΡΙΟ TAB (ΗΜΕΡΑΣ) --- */}
                {activeTab === 'schedule' && (
                    <div className="flex flex-col gap-4 animate-slideUp">
                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-white text-base">Κατάσταση Ημέρας ({shortDays[dayOfWeek]} {currentDateObj.getDate()})</div>
                                    <div className="text-xs text-zinc-500 mt-1">Ειδικό ωράριο μόνο για αυτή την ημερομηνία.</div>
                                </div>
                                <button onClick={toggleDayStatus} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner [webkit-tap-highlight-color:transparent] ${currentDaySchedule.isOpen ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)] border border-white' : 'bg-zinc-800 border border-zinc-700'}`}>
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-zinc-900 shadow-md transition-transform duration-300 ${currentDaySchedule.isOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-4">
                                <h2 className="text-sm font-bold text-white tracking-wide m-0">Διαθέσιμες Ώρες</h2>
                                <div className={`flex gap-2 transition-all ${!currentDaySchedule.isOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <button onClick={resetToDefaultSlots} className="text-xs px-3 py-2 bg-zinc-800 border border-zinc-700 shadow-sm text-zinc-300 hover:bg-zinc-700 rounded-xl font-bold active:scale-95 transition-all">Επαναφορά</button>
                                    <button onClick={clearAllSlots} className="text-xs px-3 py-2 bg-red-950/30 text-red-500 border border-red-900/50 shadow-sm rounded-xl font-bold active:scale-95 transition-all hover:bg-red-900/50">Καθαρ.</button>
                                </div>
                            </div>

                            {!currentDaySchedule.isOpen ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-sm font-bold bg-black/40 rounded-xl backdrop-blur-md border border-zinc-800">Το κατάστημα είναι κλειστό.</div>
                            ) : (
                                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [-webkit-overflow-scrolling:touch]">
                                    {allPossibleSlots.map(slot => {
                                        const isActive = currentDaySchedule.slots.includes(slot);
                                        return (
                                            <button key={slot} onClick={() => toggleSpecificSlot(slot)} className={`w-full flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 [webkit-tap-highlight-color:transparent] ${isActive ? 'bg-white/10 border border-white/60 text-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-black/40 text-zinc-500 border border-zinc-800 hover:bg-zinc-800'}`}>
                                                <span className="text-base font-bold tracking-wider">{slot}</span>
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${isActive ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-zinc-600'}`}>{isActive ? 'ΕΝΕΡΓΗ' : 'ΚΛΕΙΔΩΜΕΝΗ'}</span>
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
                    <div className="flex flex-col gap-4 animate-slideUp">
                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest m-0 ml-1">Εβδομαδιαιο Ωραριο</h2>
                            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                                    const isSelected = activeSettingsDay === dayIdx;
                                    return (
                                        <button key={dayIdx} onClick={() => setActiveSettingsDay(dayIdx)} className={`flex-1 min-w-[50px] py-3 rounded-xl font-bold text-xs uppercase transition-all border ${isSelected ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105' : 'bg-black/40 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
                                            {shortDays[dayIdx]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-white text-base">Γενικός Κανόνας ({shortDays[activeSettingsDay]})</div>
                                    <div className="text-xs text-zinc-500 mt-1">Εφαρμόζεται σε όλες τις εβδομάδες.</div>
                                </div>
                                <button onClick={() => saveWeeklySchedule(activeSettingsDay, !settingsDaySchedule.isOpen, settingsDaySchedule.slots)} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner [webkit-tap-highlight-color:transparent] ${settingsDaySchedule.isOpen ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)] border border-white' : 'bg-zinc-800 border border-zinc-700'}`}>
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-zinc-900 shadow-md transition-transform duration-300 ${settingsDaySchedule.isOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-4">
                                <h2 className="text-sm font-bold text-white tracking-wide m-0">Μόνιμες Ώρες</h2>
                                <div className={`flex gap-2 transition-all ${!settingsDaySchedule.isOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <button onClick={() => saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, defaultScheduleSlots)} className="text-xs px-3 py-2 bg-zinc-800 border border-zinc-700 shadow-sm text-zinc-300 hover:bg-zinc-700 rounded-xl font-bold active:scale-95 transition-all">Επαναφορά</button>
                                    <button onClick={() => saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, [])} className="text-xs px-3 py-2 bg-red-950/30 text-red-500 border border-red-900/50 shadow-sm rounded-xl font-bold active:scale-95 transition-all hover:bg-red-900/50">Καθαρ.</button>
                                </div>
                            </div>

                            {!settingsDaySchedule.isOpen ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-sm font-bold bg-black/40 rounded-xl backdrop-blur-md border border-zinc-800">Η ημέρα είναι προεπιλεγμένη ως Κλειστή.</div>
                            ) : (
                                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [-webkit-overflow-scrolling:touch]">
                                    {allPossibleSlots.map(slot => {
                                        const isActive = settingsDaySchedule.slots.includes(slot);
                                        return (
                                            <button key={slot} onClick={() => {
                                                const updated = isActive ? settingsDaySchedule.slots.filter((s: string) => s !== slot) : [...settingsDaySchedule.slots, slot].sort();
                                                saveWeeklySchedule(activeSettingsDay, settingsDaySchedule.isOpen, updated);
                                            }} className={`w-full flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 [webkit-tap-highlight-color:transparent] ${isActive ? 'bg-white/10 border border-white/60 text-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'bg-black/40 text-zinc-500 border border-zinc-800 hover:bg-zinc-800'}`}>
                                                <span className="text-base font-bold tracking-wider">{slot}</span>
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${isActive ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-zinc-600'}`}>{isActive ? 'ΕΝΕΡΓΗ' : 'ΚΛΕΙΔΩΜΕΝΗ'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Μαζική Εφαρμογή */}
                        <div className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-800 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                <div>
                                    <h2 className="text-sm font-bold text-white tracking-wide m-0">Μαζική Εφαρμογή</h2>
                                    <p className="text-xs text-zinc-500 mt-1 mb-0">Αντιγραφή του ωραρίου της <strong>{shortDays[activeSettingsDay]}</strong> σε όλες τις υπόλοιπες ημέρες.</p>
                                </div>
                                <button 
                                    onClick={applyScheduleToAllDays} 
                                    className="w-full sm:w-auto text-xs px-4 py-3 bg-white/10 border border-white/50 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all"
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-[6px] z-50 flex items-end justify-center overflow-hidden p-0 m-0" onClick={(e) => e.target === e.currentTarget && setActiveModal('NONE')}>
                    <div className="bg-zinc-950 w-full max-w-lg p-6 rounded-t-3xl border-t border-white/50 shadow-[0_-10px_40px_rgba(255,255,255,0.2)] flex flex-col gap-6 animate-slideUp">
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-sm font-bold text-white tracking-wide uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]">Εκτακτη Ωρα</h3>
                            <button className="bg-zinc-900 border border-zinc-700 shadow-sm rounded-full w-9 h-9 flex items-center justify-center text-zinc-400 font-bold active:scale-95 hover:bg-zinc-800 hover:text-white" onClick={() => setActiveModal('NONE')}>✕</button>
                        </div>
                        <div className="flex justify-center items-center gap-3">
                            <select value={customH} onChange={e => setCustomH(e.target.value)} className="flex-1 bg-black border border-zinc-800 text-white font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none shadow-sm focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                                {Array.from({length: 17}, (_, i) => String(i + 7).padStart(2, '0')).map(h => <option key={h} value={h}>{h}:00</option>)}
                            </select>
                            <span className="text-2xl font-bold text-zinc-600">:</span>
                            <select value={customM} onChange={e => setCustomM(e.target.value)} className="flex-1 bg-black border border-zinc-800 text-white font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none shadow-sm focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <button className="w-full bg-white text-black hover:bg-zinc-200 font-extrabold py-4 rounded-2xl tracking-widest uppercase active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.6)]" onClick={() => {
                            const newTime = `${customH}:${customM}`;
                            addCustomTime(dateStr, newTime);
                            setActiveModal('NONE');
                        }}>ΠΡΟΣΘΗΚΗ ΩΡΑΣ</button>
                    </div>
                </div>
            )}

            {activeModal === 'ADD_USER' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-[6px] z-50 flex items-end justify-center overflow-hidden p-0 m-0" onClick={(e) => e.target === e.currentTarget && setActiveModal('NONE')}>
                    <div className="bg-zinc-950 w-full max-w-lg p-6 rounded-t-3xl border-t border-white/50 shadow-[0_-10px_40px_rgba(255,255,255,0.2)] flex flex-col gap-6 animate-slideUp">
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-sm font-bold text-white tracking-wide uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]">Νεος Χρηστης</h3>
                            <button className="bg-zinc-900 border border-zinc-700 shadow-sm rounded-full w-9 h-9 flex items-center justify-center text-zinc-400 font-bold active:scale-95 hover:bg-zinc-800 hover:text-white" onClick={() => setActiveModal('NONE')}>✕</button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                value={newUserName} 
                                onChange={e => setNewUserName(e.target.value)} 
                                placeholder="Όνομα (π.χ. Μαρία, Αντώνης)..." 
                                className="w-full bg-black border border-zinc-800 text-white font-bold text-lg p-4 rounded-2xl outline-none shadow-sm focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-all"
                            />
                        </div>
                        <button className="w-full bg-white text-black hover:bg-zinc-200 font-extrabold py-4 rounded-2xl tracking-widest uppercase active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.6)]" onClick={handleAddUser}>
                            ΠΡΟΣΘΗΚΗ
                        </button>
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}