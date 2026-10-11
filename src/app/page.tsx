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

// --- Types ---
type AppData = {
    appointments: Record<string, Record<string, any>>; 
    permanent: Record<string, Record<string, any>>;    
    customTimes: Record<string, string[]>;             
    fixedBreaks: string[];                             
};

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

    useEffect(() => { setLocalName(activeAppt?.name || ''); }, [activeAppt?.name]);
    useEffect(() => { setLocalComment(activeAppt?.comment || ''); }, [activeAppt?.comment]);

    let nameVal = activeAppt?.name || '';
    let status = activeAppt?.status || 'PENDING';
    let isCompleted = activeAppt?.isCompleted || false;

    if (!nameVal && isFixedBreak) nameVal = 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ';

    // Soft White and Black Glassmorphism
    let cardClass = 'bg-white/70 border-zinc-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)]';
    let indicatorClass = 'bg-zinc-300 border border-zinc-400/50 shadow-[0_0_8px_rgba(0,0,0,0.03)]';
    
    if (nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ') {
        cardClass = 'bg-red-50/40 border-red-200/50 shadow-sm';
        indicatorClass = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] border-red-400';
    } else if (nameVal) {
        if (status === 'PENDING') indicatorClass = 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)] border-amber-300';
        if (status === 'APPROVED') indicatorClass = 'bg-zinc-800 shadow-[0_0_12px_rgba(0,0,0,0.15)] border-zinc-900';
        if (isCompleted) {
            cardClass = 'bg-zinc-50/50 border-zinc-200 shadow-sm';
            indicatorClass = 'bg-zinc-400 shadow-[0_0_10px_rgba(0,0,0,0.08)] border-zinc-500';
        }
    }

    const showDetails = (localName || nameVal) && nameVal !== 'ΔΙΑΛΕΙΜΜΑ' && nameVal !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ';

    return (
        <div id={`appointment-${time}`} className={`flex flex-col backdrop-blur-xl border rounded-[1.25rem] p-4 transition-all duration-300 ${cardClass} ${isHighlighted ? 'border-zinc-900 shadow-[0_0_30px_rgba(0,0,0,0.06)] scale-[1.01]' : ''}`}>
            <div className="flex gap-4">
                <div className="flex flex-col items-center justify-start mt-1 shrink-0 w-[50px]">
                    <span className={`text-xl font-extrabold tracking-tight drop-shadow-sm ${nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' ? 'text-red-500' : 'text-zinc-900'}`}>{time}</span>
                </div>
                <div className={`w-1.5 rounded-full shrink-0 ${indicatorClass}`}></div>
                
                <div className="flex-1 py-1 min-w-0 flex flex-col gap-2">
                    <input type="text" className={`w-full bg-transparent border-none outline-none font-bold text-lg p-0 placeholder:font-normal placeholder:text-zinc-400 transition-all drop-shadow-sm ${isCompleted ? 'text-zinc-400 line-through' : nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' ? 'text-red-500' : 'text-zinc-900'}`}
                        value={nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' ? nameVal : localName} 
                        placeholder="Όνομα πελάτη..." 
                        readOnly={nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ'}
                        onChange={e => setLocalName(e.target.value)} 
                        onBlur={() => { if (localName !== (activeAppt?.name || '')) onUpdate({ name: localName, status: status }) }}
                    />
                    {showDetails && (
                        <input type="text" className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors shadow-inner ${isCompleted ? 'bg-zinc-100 border-zinc-200 text-zinc-400 line-through' : 'bg-white/90 border-zinc-300 text-zinc-800 focus:bg-white focus:border-zinc-800'}`}
                            value={localComment} 
                            placeholder="Σχόλιο / Λεπτομέρειες..." 
                            onChange={e => setLocalComment(e.target.value)} 
                            onBlur={() => { if (localComment !== (activeAppt?.comment || '')) onUpdate({ comment: localComment }) }}
                        />
                    )}
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-zinc-200/70">
                <button onClick={() => onUpdate({ status: status === 'APPROVED' ? 'PENDING' : 'APPROVED' })} className={`w-[40px] h-[40px] flex items-center justify-center rounded-xl border transition-all shadow-sm active:scale-95 ${status === 'APPROVED' ? 'bg-zinc-900 border-zinc-900 text-white shadow-inner' : 'bg-white/80 border-zinc-300 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-400'}`}>✓</button>
                <button onClick={() => onUpdate({ isCompleted: !isCompleted })} className={`w-[40px] h-[40px] flex items-center justify-center rounded-xl border transition-all shadow-sm active:scale-95 ${isCompleted ? 'bg-zinc-400 border-zinc-400 text-zinc-900 shadow-inner' : 'bg-white/80 border-zinc-300 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-400'}`}>✔</button>
                <button onClick={() => onUpdate({ name: 'ΔΙΑΛΕΙΜΜΑ', comment: '' })} className="w-[40px] h-[40px] flex items-center justify-center rounded-xl bg-white/80 border border-zinc-300 text-zinc-700 shadow-sm hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-400 transition-all active:scale-95">॥</button>
                <button onClick={() => onUpdate({ isCancelled: true, name: '' })} className="w-[40px] h-[40px] flex items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm hover:bg-red-100 transition-all active:scale-95">✕</button>
            </div>
        </div>
    );
}

export default function AdminPanel() {
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pinInput, setPinInput] = useState('');
    
    const [activeTab, setActiveTab] = useState<'appointments' | 'schedule'>('appointments');
    const [currentDateObj, setCurrentDateObj] = useState<Date>(() => new Date());

    const dateStr = formatDateStr(currentDateObj);
    const dayOfWeek = currentDateObj.getDay();

    const [appData, setAppData] = useState<AppData>({
        appointments: {},
        permanent: {},
        customTimes: {},
        fixedBreaks: []
    });

    const [schedulesMap, setSchedulesMap] = useState<Record<string, { isOpen: boolean, slots: string[] }>>({});
    const [currentDaySchedule, setCurrentDaySchedule] = useState({ isOpen: true, slots: defaultScheduleSlots });

    const [activeModal, setActiveModal] = useState<'NONE' | 'ADD_TIME'>('NONE');
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const [isAddingAppointment, setIsAddingAppointment] = useState(false);
    const [newAppForm, setNewAppForm] = useState({ name: '', comment: '', time: '', service: 'Υπηρεσία' });
    
    const [customH, setCustomH] = useState('12');
    const [customM, setCustomM] = useState('00');

    // Filter and search states
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyFree, setShowOnlyFree] = useState(false);

    // --- Firebase DB Listener ---
    useEffect(() => {
        setIsClient(true);
        const hasAccess = localStorage.getItem('xristofilakis_admin_access');
        if (hasAccess === 'true') {
            setIsAuthenticated(true);
        }

        const dbRef = ref(db, 'xristofilakis');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            setAppData({
                appointments: data.appointments || {},
                permanent: data.permanent || {},
                customTimes: data.customTimes || {},
                fixedBreaks: data.fixedBreaks || []
            });
            setSchedulesMap(data.schedulesMap || {});
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const daySchedule = schedulesMap[dateStr];
        if (daySchedule) {
            setCurrentDaySchedule(daySchedule);
        } else {
            setCurrentDaySchedule({ isOpen: true, slots: defaultScheduleSlots });
        }
    }, [dateStr, schedulesMap]);

    const handleLogin = () => {
        if (pinInput === ADMIN_PIN) {
            setIsAuthenticated(true);
            localStorage.setItem('xristofilakis_admin_access', 'true');
            setPinInput('');
        } else {
            alert('Μη έγκυρο PIN.');
            setPinInput('');
        }
    };

    const handleLogout = () => {
        if (confirm("Αποσύνδεση από το σύστημα;")) {
            localStorage.removeItem('xristofilakis_admin_access');
            setIsAuthenticated(false);
        }
    };

    const updateAppt = (dStr: string, time: string, payload: any) => {
        const currentAppt = appData.appointments[dStr]?.[time] || {};
        const updatedAppt = { ...currentAppt, ...payload };
        
        setAppData(prev => {
            const newAppointments = { ...prev.appointments };
            if (!newAppointments[dStr]) newAppointments[dStr] = {};
            
            if (payload.isCancelled) {
                delete newAppointments[dStr][time];
            } else {
                newAppointments[dStr][time] = updatedAppt;
            }
            return { ...prev, appointments: newAppointments };
        });

        const apptRef = ref(db, `xristofilakis/appointments/${dStr}/${time}`);
        if (payload.isCancelled) {
            remove(apptRef).catch(err => alert("Πρόβλημα σύνδεσης με Firebase: Ελέγξτε τα Rules."));
        } else {
            set(apptRef, updatedAppt).catch(err => alert("Πρόβλημα σύνδεσης με Firebase: Ελέγξτε τα Rules."));
        }
    };

    const saveScheduleToState = (isOpen: boolean, slots: string[]) => {
        setSchedulesMap(prev => ({ ...prev, [dateStr]: { isOpen, slots } }));
        set(ref(db, `xristofilakis/schedulesMap/${dateStr}`), { isOpen, slots }).catch(console.error);
    };

    const toggleDayStatus = () => {
        const newStatus = !currentDaySchedule.isOpen;
        setCurrentDaySchedule({ ...currentDaySchedule, isOpen: newStatus });
        saveScheduleToState(newStatus, currentDaySchedule.slots);
    };

    const toggleSpecificSlot = (slot: string) => {
        let updatedSlots;
        if (currentDaySchedule.slots.includes(slot)) {
            updatedSlots = currentDaySchedule.slots.filter(s => s !== slot);
        } else {
            updatedSlots = [...currentDaySchedule.slots, slot].sort();
        }
        setCurrentDaySchedule({ ...currentDaySchedule, slots: updatedSlots });
        saveScheduleToState(currentDaySchedule.isOpen, updatedSlots);
    };

    const resetToDefaultSlots = () => {
        setCurrentDaySchedule({ ...currentDaySchedule, slots: defaultScheduleSlots });
        saveScheduleToState(currentDaySchedule.isOpen, defaultScheduleSlots);
    };

    const clearAllSlots = () => {
        setCurrentDaySchedule({ ...currentDaySchedule, slots: [] });
        saveScheduleToState(currentDaySchedule.isOpen, []);
    };

    const addCustomTime = (dStr: string, newTime: string) => {
        const existing = appData.customTimes[dStr] || [];
        if (!existing.includes(newTime)) {
            const updatedTimes = [...existing, newTime];
            setAppData(prev => ({
                ...prev,
                customTimes: { ...prev.customTimes, [dStr]: updatedTimes }
            }));
            set(ref(db, `xristofilakis/customTimes/${dStr}`), updatedTimes).catch(console.error);
        }
    };

    const handleCreateAppointment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAppForm.time) {
            alert('Επιλέξτε ώρα.');
            return;
        }

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
        let customTimes = appData.customTimes[dateStr] || [];
        let bookedTimes = Object.keys(appData.appointments[dateStr] || {}).filter(t => !appData.appointments[dateStr][t]?.isCancelled);
        return Array.from(new Set([...baseSlots, ...customTimes, ...bookedTimes])).sort((a, b) => a.localeCompare(b));
    }, [currentDaySchedule, dateStr, appData.customTimes, appData.appointments]);

    // --- Filter logic for search and free/busy ---
    const displayedTimes = useMemo(() => {
        return allTimes.filter(time => {
            const appt = appData.appointments[dateStr]?.[time];
            const perm = appData.permanent[`day_${dayOfWeek}`]?.[time] || appData.permanent[dayOfWeek]?.[time];
            
            let nameVal = '';
            let commentVal = '';
            let isCancelled = false;

            if (appt) {
                nameVal = appt.name || '';
                commentVal = appt.comment || '';
                isCancelled = !!appt.isCancelled;
            } else if (perm) {
                nameVal = perm.name || '';
                commentVal = perm.comment || '';
            }

            const isFixedBreak = appData.fixedBreaks.includes(time);
            const isBreak = nameVal === 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ' || nameVal === 'ΔΙΑΛΕΙΜΜΑ' || isFixedBreak;
            const isBooked = nameVal !== '' && !isCancelled && !isBreak;

            // 1. Show Only Free
            if (showOnlyFree) {
                if (isBooked || isBreak) return false;
            }

            // 2. Search filter
            if (searchTerm.trim() !== '') {
                const searchLower = searchTerm.toLowerCase();
                const matchName = nameVal.toLowerCase().includes(searchLower);
                const matchComment = commentVal.toLowerCase().includes(searchLower);
                const matchTime = time.includes(searchLower);
                
                if (!matchName && !matchComment && !matchTime) {
                    return false;
                }
            }

            return true;
        });
    }, [allTimes, appData, dateStr, dayOfWeek, showOnlyFree, searchTerm]);

    const stats = useMemo(() => {
        let total = 0;
        let done = 0;
        let appsList: any[] = [];

        allTimes.forEach(time => {
            const appt = appData.appointments[dateStr]?.[time];
            const perm = appData.permanent[`day_${dayOfWeek}`]?.[time] || appData.permanent[dayOfWeek]?.[time];
            
            let nameVal = '';
            let isComp = false;

            if (appt && (appt.name || appt.isCancelled)) {
                if (!appt.isCancelled) {
                    nameVal = appt.name;
                    isComp = appt.isCompleted;
                }
            } else if (perm) {
                nameVal = perm.name;
            }

            if (nameVal && nameVal !== 'ΔΙΑΛΕΙΜΜΑ' && nameVal !== 'ΣΤΑΘΕΡΟ ΔΙΑΛΕΙΜΜΑ') {
                total++;
                if (isComp) done++;
                appsList.push({ time, name: nameVal, isComp });
            }
        });
        return { total, done, appsList };
    }, [allTimes, appData, dateStr, dayOfWeek]);

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
            <div className="fixed inset-0 flex items-center justify-center z-50 p-5 bg-zinc-50">
                {/* Soft White Abstract Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000002_1px,transparent_1px),linear-gradient(to_bottom,#00000002_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="absolute top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-zinc-200 blur-[120px]"></div>
                    <div className="absolute bottom-[5%] -right-[5%] w-[50vw] h-[50vw] rounded-full bg-zinc-100 blur-[100px]"></div>
                </div>

                <div className="bg-white/90 backdrop-blur-3xl border border-zinc-200/80 rounded-3xl p-10 w-full max-w-sm text-center shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative z-10">
                    <div className="relative flex flex-col items-center justify-center mb-10 w-full">
                        <h1 className="relative z-10 m-0 text-zinc-900 text-3xl font-black tracking-tight">
                            LOADING
                        </h1>
                        <p className="relative z-10 text-zinc-500 text-[0.65rem] tracking-[6px] uppercase mt-2 font-bold m-0">
                            Συστημα Διαχειρισης
                        </p>
                    </div>

                    <input 
                        type="password" 
                        value={pinInput} 
                        onChange={e => setPinInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleLogin()} 
                        className="w-full bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-xl p-4 text-3xl text-center mb-6 outline-none tracking-[20px] font-medium transition-all focus:border-zinc-500 focus:bg-white shadow-inner relative z-10" 
                        maxLength={4} 
                        placeholder="••••" 
                    />
                    <button className="w-full bg-zinc-900 text-white border-none rounded-xl p-4 text-sm font-extrabold uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-black relative z-10" onClick={handleLogin}>
                        ΕΙΣΟΔΟΣ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-[100dvh] text-zinc-800 font-sans overflow-x-hidden antialiased select-none pb-[calc(4rem+env(safe-area-inset-bottom))] bg-zinc-100">
            
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-zinc-200/50 blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[20%] w-[50vw] h-[50vw] rounded-full bg-zinc-100/50 blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col pt-6 sm:pt-12 px-3 sm:px-6">
                
                {/* Navigation & Header */}
                <nav className="flex flex-col gap-3 bg-white/70 backdrop-blur-2xl p-4 rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-zinc-200 mb-4">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col items-start justify-center ml-2">
                            <span className="text-zinc-950 text-2xl font-black tracking-tight drop-shadow-sm">
                                LOADING
                            </span>
                            <span className="text-zinc-500 text-[0.6rem] tracking-[4px] font-bold uppercase mt-1">
                                Πινακας Ελεγχου
                            </span>
                        </div>
                        <button className="bg-zinc-100 text-zinc-700 border border-zinc-200/70 rounded-lg px-3 py-2 text-xs font-bold transition-all hover:bg-white hover:text-zinc-950 shadow-sm" onClick={handleLogout}>ΕΞΟΔΟΣ</button>
                    </div>

                    <div className="flex gap-2 bg-zinc-200/30 p-1.5 rounded-xl mt-2 border border-zinc-200 shadow-inner">
                        <button 
                            onClick={() => { setActiveTab('appointments'); setIsAddingAppointment(false); setIsOverviewOpen(false); }} 
                            className={`flex-1 p-2.5 rounded-lg border-none font-bold text-sm transition-all cursor-pointer ${activeTab === 'appointments' ? 'bg-white text-zinc-950 shadow-md border border-zinc-200' : 'bg-transparent text-zinc-500 hover:bg-white/40'}`}
                        >
                            Ραντεβού
                        </button>
                        <button 
                            onClick={() => { setActiveTab('schedule'); setIsAddingAppointment(false); setIsOverviewOpen(false); }} 
                            className={`flex-1 p-2.5 rounded-lg border-none font-bold text-sm transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-white text-zinc-950 shadow-md border border-zinc-200' : 'bg-transparent text-zinc-500 hover:bg-white/40'}`}
                        >
                            Ωράριο
                        </button>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">🔍</span>
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-white/60 border border-zinc-200 rounded-xl text-zinc-900 py-3 pr-9 pl-9 text-sm outline-none placeholder:text-zinc-400 shadow-inner focus:bg-white focus:border-zinc-500 transition-all" 
                                placeholder="Αναζήτηση..." 
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 font-bold">✕</button>
                            )}
                        </div>
                        <button 
                            onClick={() => setShowOnlyFree(!showOnlyFree)}
                            className={`rounded-xl px-4 font-bold text-xs uppercase tracking-widest transition-all border ${showOnlyFree ? 'bg-zinc-900 text-white border-zinc-950 shadow-md' : 'bg-white/60 text-zinc-500 border-zinc-200 hover:bg-white'}`}
                        >
                            ΕΛΕΥΘΕΡΑ
                        </button>
                    </div>
                </nav>

                {/* Calendar Ribbon */}
                <div className="bg-white/70 backdrop-blur-2xl border border-zinc-200 rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.02)] mb-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-base font-bold text-zinc-900 m-0 uppercase tracking-wide">{monthsGreek[currentDateObj.getMonth()]} {currentDateObj.getFullYear()}</h3>
                        <div className="relative w-8 h-8 shrink-0">
                            <div className="w-full h-full bg-white border border-zinc-200 rounded-lg flex justify-center items-center text-zinc-600 text-lg shadow-sm">📅</div>
                            <input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={formatDateStr(currentDateObj)} onChange={(e) => {
                                const d = new Date(e.target.value);
                                setCurrentDateObj(d);
                                setIsAddingAppointment(false);
                                setIsOverviewOpen(false);
                                setSearchTerm('');
                                setShowOnlyFree(false);
                            }} />
                        </div>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                        {Array.from({length: 15}).map((_, i) => {
                            let d = new Date();
                            d.setDate(d.getDate() - 2 + i);
                            let checkStr = formatDateStr(d);
                            let isToday = checkStr === formatDateStr(new Date());
                            let isSelected = checkStr === dateStr;
                            let isSunday = d.getDay() === 0;
                            return (
                                <button key={i} className={`snap-center min-w-[65px] flex flex-col items-center justify-center p-2.5 rounded-xl cursor-pointer shrink-0 transition-all border ${
                                    isSelected ? 'bg-zinc-900 border-zinc-950 text-white shadow-[0_4px_15px_rgba(0,0,0,0.08)] scale-105' :
                                    'bg-white/60 border-zinc-200 hover:bg-white'
                                } ${isToday && !isSelected ? 'border-zinc-400' : ''}`}
                                    onClick={(e) => { e.preventDefault(); setCurrentDateObj(d); setIsAddingAppointment(false); setIsOverviewOpen(false); setSearchTerm(''); setShowOnlyFree(false); }}>
                                    <span className={`text-[0.65rem] font-bold uppercase tracking-wider mb-0.5 ${isSelected ? 'text-zinc-300' : isSunday ? 'text-red-500' : 'text-zinc-500'}`}>{shortDays[d.getDay()]}</span>
                                    <span className={`text-2xl font-bold mb-0.5 ${isSelected ? 'text-white' : 'text-zinc-800'}`}>{d.getDate()}</span>
                                    <span className={`text-[0.6rem] font-bold uppercase ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{shortMonths[d.getMonth()]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === 'appointments' && (
                    <>
                        {/* Stats Panel */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <button onClick={() => setIsOverviewOpen(!isOverviewOpen)} className="bg-white/70 backdrop-blur-3xl border border-zinc-200 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center transition-all active:scale-95 hover:bg-white">
                                <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Συνολο</span>
                                <span className="text-3xl font-bold text-zinc-950">{!currentDaySchedule.isOpen ? '-' : stats.total}</span>
                            </button>
                            <div className="bg-white/70 backdrop-blur-3xl border border-zinc-200 shadow-sm rounded-2xl p-4 flex flex-col items-center justify-center">
                                <span className="text-[0.65rem] text-zinc-500 font-bold uppercase tracking-widest mb-1">Ολοκληρωμενα</span>
                                <span className={`text-3xl font-bold ${stats.done > 0 ? 'text-zinc-900 drop-shadow-sm' : 'text-zinc-900'}`}>{!currentDaySchedule.isOpen ? '-' : stats.done}</span>
                            </div>
                        </div>

                        {/* Overview Dropdown */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOverviewOpen ? 'max-h-[400px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                            <div className="bg-white/90 backdrop-blur-3xl border border-zinc-200 rounded-2xl p-3 space-y-2 max-h-[300px] overflow-y-auto shadow-sm">
                                {stats.appsList.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-zinc-500 font-medium">Καμία κράτηση.</div>
                                ) : (
                                    stats.appsList.map(app => (
                                        <button key={app.time} onClick={() => scrollToAppointment(app.time)} className="w-full flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-all active:scale-95 border border-zinc-200 shadow-sm">
                                            <span className="text-zinc-800 font-bold text-sm">{app.time}</span>
                                            <span className={`text-sm font-bold transition-all ${app.isComp ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>{app.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Section Header */}
                        <div className="flex justify-between items-center px-1 border-b border-zinc-200 pb-3 mb-4">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest m-0 drop-shadow-sm">Κρατησεις</h2>
                            {currentDaySchedule.isOpen && (
                                <div className="flex gap-2">
                                    <button className="bg-white/80 border border-zinc-300/80 text-zinc-700 rounded-xl px-3 py-1.5 text-[0.7rem] font-bold hover:bg-white active:scale-95 shadow-sm" onClick={() => setActiveModal('ADD_TIME')}>+ ΩΡΑ</button>
                                    <button className={`border rounded-xl px-3 py-1.5 text-[0.7rem] font-bold active:scale-95 shadow-sm transition-all ${isAddingAppointment ? 'bg-zinc-900 border-zinc-950 text-white shadow-[0_4px_15px_rgba(0,0,0,0.08)]' : 'bg-white/80 border-zinc-300 text-zinc-700 hover:bg-white'}`} onClick={() => setIsAddingAppointment(!isAddingAppointment)}>
                                        {isAddingAppointment ? 'ΑΚΥΡΩΣΗ' : '+ ΡΑΝΤΕΒΟΥ'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Add Appointment Form */}
                        {isAddingAppointment && (
                            <form onSubmit={handleCreateAppointment} className="bg-white border border-zinc-200 rounded-[1.5rem] p-5 space-y-4 mb-4 shadow-[0_15px_40px_rgba(0,0,0,0.03)] animate-slideUp">
                                <div className="flex flex-col gap-2.5">
                                    <input type="text" placeholder="Όνομα πελάτη..." value={newAppForm.name} onChange={e => setNewAppForm({...newAppForm, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white transition-all" />
                                    <input type="text" placeholder="Σχόλιο / Υπηρεσία..." value={newAppForm.comment} onChange={e => setNewAppForm({...newAppForm, comment: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 outline-none focus:border-zinc-400 focus:bg-white transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[0.65rem] font-bold text-zinc-400 uppercase tracking-widest mb-2">Επιλογη Ωρας</label>
                                    <div className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]">
                                        {allPossibleSlots.map(slot => (
                                            <button type="button" key={slot} onClick={() => setNewAppForm({...newAppForm, time: slot})} className={`flex-none py-2.5 px-4 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm ${newAppForm.time === slot ? 'bg-zinc-950 text-white border border-zinc-900' : 'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-white'}`}>
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-zinc-900 hover:bg-black text-white font-extrabold px-6 py-3.5 rounded-xl text-sm active:scale-95 transition-all shadow-md">ΚΑΤΑΧΩΡΗΣΗ</button>
                            </form>
                        )}

                        {/* Appointments List */}
                        <div className="flex flex-col gap-3">
                            {!currentDaySchedule.isOpen ? (
                                <div className="text-center py-10 text-zinc-500 text-sm font-bold uppercase tracking-widest drop-shadow-sm bg-white/40 rounded-xl backdrop-blur-md border border-zinc-200">ΤΟ ΚΑΤΑΣΤΗΜΑ ΕΙΝΑΙ ΚΛΕΙΣΤΟ</div>
                            ) : displayedTimes.length === 0 ? (
                                <div className="text-center py-10 text-zinc-400 text-sm font-bold drop-shadow-sm bg-white/40 rounded-xl backdrop-blur-md border border-zinc-200">
                                    {searchTerm || showOnlyFree ? 'Δεν βρέθηκαν αποτελέσματα με τα τρέχοντα φίλτρα.' : 'Δεν υπάρχουν διαθέσιμες ώρες.'}
                                </div>
                            ) : displayedTimes.map(time => {
                                const isFixedBreak = appData.fixedBreaks.includes(time);
                                const appt = appData.appointments[dateStr]?.[time];
                                const perm = appData.permanent[`day_${dayOfWeek}`]?.[time] || appData.permanent[dayOfWeek]?.[time];
                                
                                return <AppointmentSlot 
                                    key={time} 
                                    time={time} 
                                    activeAppt={appt && !appt.isCancelled ? appt : (perm ? { name: perm.name, comment: perm.comment, status: 'APPROVED', isCompleted: false } : null)} 
                                    isFixedBreak={isFixedBreak} 
                                    isHighlighted={highlightedId === time} 
                                    onUpdate={(payload: any) => updateAppt(dateStr, time, payload)} 
                                />
                            })}
                        </div>
                    </>
                )}

                {activeTab === 'schedule' && (
                    <div className="flex flex-col gap-4 animate-slideUp">
                        <div className="bg-white/75 backdrop-blur-3xl border border-zinc-200 rounded-[1.5rem] p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-zinc-950 text-base">Κατάσταση Ημέρας</div>
                                    <div className="text-xs text-zinc-500 mt-1">Αν είναι off, δεν δέχεται ραντεβού.</div>
                                </div>
                                <button onClick={toggleDayStatus} className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner [webkit-tap-highlight-color:transparent] ${currentDaySchedule.isOpen ? 'bg-zinc-900' : 'bg-zinc-200 border border-zinc-300'}`}>
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-zinc-100 shadow-md transition-transform duration-300 ${currentDaySchedule.isOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/75 backdrop-blur-3xl border border-zinc-200 rounded-[1.5rem] p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-5 border-b border-zinc-200/50 pb-4">
                                <h2 className="text-sm font-bold text-zinc-950 tracking-wide m-0">Διαθέσιμες Ώρες</h2>
                                <div className={`flex gap-2 transition-all ${!currentDaySchedule.isOpen ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                    <button onClick={resetToDefaultSlots} className="text-xs px-3 py-2 bg-zinc-50 border border-zinc-200/70 shadow-sm text-zinc-700 hover:bg-white rounded-xl font-bold active:scale-95 transition-all">Επαναφορά</button>
                                    <button onClick={clearAllSlots} className="text-xs px-3 py-2 bg-red-50 text-red-600 border border-red-100 shadow-sm rounded-xl font-bold active:scale-95 transition-all hover:bg-red-200">Καθαρ.</button>
                                </div>
                            </div>

                            {!currentDaySchedule.isOpen ? (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-400 text-sm font-bold bg-white/40 rounded-xl backdrop-blur-md">
                                    Το κατάστημα είναι κλειστό.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [-webkit-overflow-scrolling:touch]">
                                    {allPossibleSlots.map(slot => {
                                        const isActive = currentDaySchedule.slots.includes(slot);
                                        return (
                                            <button key={slot} onClick={() => toggleSpecificSlot(slot)} className={`w-full flex items-center justify-between py-4 px-5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 [webkit-tap-highlight-color:transparent] ${isActive ? 'bg-zinc-100 border border-zinc-300/80 text-zinc-900 font-bold' : 'bg-white/40 text-zinc-400 border border-zinc-200 hover:bg-zinc-100'}`}>
                                                <span className="text-base font-bold tracking-wider">{slot}</span>
                                                <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${isActive ? 'text-zinc-700' : 'text-zinc-300'}`}>
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
            </div>

            {/* Modal */}
            {activeModal === 'ADD_TIME' && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-50 flex items-end justify-center overflow-hidden p-0 m-0" onClick={(e) => e.target === e.currentTarget && setActiveModal('NONE')}>
                    <div className="bg-white w-full max-w-lg p-6 rounded-t-3xl border-t border-zinc-200/80 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col gap-6 animate-slideUp">
                        <div className="flex justify-between items-center">
                            <h3 className="m-0 text-sm font-bold text-zinc-900 tracking-wide uppercase">Εκτακτη Ωρα</h3>
                            <button className="bg-zinc-100 border border-zinc-200 shadow-sm rounded-full w-9 h-9 flex items-center justify-center text-zinc-500 font-bold active:scale-95 hover:bg-zinc-200" onClick={() => setActiveModal('NONE')}>✕</button>
                        </div>
                        <div className="flex justify-center items-center gap-3">
                            <select value={customH} onChange={e => setCustomH(e.target.value)} className="flex-1 bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none shadow-sm focus:border-zinc-400 focus:bg-white">
                                {Array.from({length: 17}, (_, i) => String(i + 7).padStart(2, '0')).map(h => <option key={h} value={h}>{h}:00</option>)}
                            </select>
                            <span className="text-2xl font-bold text-zinc-400">:</span>
                            <select value={customM} onChange={e => setCustomM(e.target.value)} className="flex-1 bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xl p-4 rounded-2xl outline-none text-center appearance-none shadow-sm focus:border-zinc-400 focus:bg-white">
                                {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <button className="w-full bg-zinc-900 hover:bg-black text-white font-bold py-4 rounded-2xl tracking-widest uppercase active:scale-95 transition-all shadow-md" onClick={() => {
                            const newTime = `${customH}:${customM}`;
                            addCustomTime(dateStr, newTime);
                            setActiveModal('NONE');
                        }}>ΠΡΟΣΘΗΚΗ ΩΡΑΣ</button>
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