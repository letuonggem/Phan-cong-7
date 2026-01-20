
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as XLSX from 'xlsx';
import { 
    LayoutDashboard, Users, CalendarDays, FileText, Settings, 
    Trash2, ChevronLeft, ChevronRight, ChevronDown,
    Plus, Edit3, Check,
    AlertTriangle, Copy, RefreshCcw, FileDown, PlusCircle, Book, Info, CheckCircle2, X, Square, CheckSquare, Search, FileSpreadsheet,
    Download, Upload, Database, Save, TableProperties, FileJson, FileType, Layers, TrendingUp, BookOpen, UserPlus, UserCheck, ShieldCheck, Briefcase
} from 'lucide-react';

// --- CẤU HÌNH HỆ THỐNG ---
const STORAGE_KEY = 'thcs_teaching_mgmt_v9_3_pro';

const DEFAULT_SUBJECT_CONFIGS = [
    { name: 'Toán', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Ngữ văn', p6: 4, p7: 4, p8: 4, p9: 4 },
    { name: 'Tiếng Anh', p6: 3, p7: 3, p8: 3, p9: 3 },
    { name: 'Vật lý', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Hóa học', p6: 0, p7: 0, p8: 2, p9: 2 },
    { name: 'Sinh học', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Lịch sử', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'Địa lý', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5 },
    { name: 'GDCD', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Tin học', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Công nghệ', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'Thể dục', p6: 2, p7: 2, p8: 2, p9: 2 },
    { name: 'Nhạc - Họa', p6: 1, p7: 1, p8: 1, p9: 1 },
    { name: 'KHTN (Lý)', p6: 1.5, p7: 1.5, p8: 1.5, p9: 1.5, parent: 'KHTN' },
    { name: 'KHTN (Hóa)', p6: 0, p7: 0, p8: 1.5, p9: 1.5, parent: 'KHTN' },
    { name: 'KHTN (Sinh)', p6: 1.5, p7: 1.5, p8: 1, p9: 1, parent: 'KHTN' },
    { name: 'HĐTN (1)', p6: 1, p7: 1, p8: 1, p9: 1, parent: 'HĐTN' },
    { name: 'HĐTN (2)', p6: 1, p7: 1, p8: 1, p9: 1, parent: 'HĐTN' },
    { name: 'HĐTN (3)', p6: 1, p7: 1, p8: 1, p9: 1, parent: 'HĐTN' },
    { name: 'GDĐP', p6: 1, p7: 1, p8: 1, p9: 1 }
];

const DEFAULT_ROLES = [
    { id: 'r1', name: 'Chủ nhiệm', reduction: 4 },
    { id: 'r2', name: 'Tổ trưởng', reduction: 3 },
    { id: 'r3', name: 'Tổ phó', reduction: 1 },
    { id: 'r4', name: 'Thư ký', reduction: 2 },
    { id: 'r5', name: 'TPT Đội', reduction: 10 }
];

// --- TIỆN ÍCH ---
const isValidClassName = (cls: string) => /^[6-9][A-Z0-9.\-_]*$/i.test(cls);

// --- COMPONENTS TỐI ƯU ---
const LocalNumericInput = ({ value, onChange, className, step = 0.5 }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);
    return (
        <input 
            type="number" step={step} className={className} 
            value={local} 
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => onChange(parseFloat(local) || 0)}
            onKeyDown={(e) => { if(e.key === 'Enter') onChange(parseFloat(local) || 0); }}
        />
    );
};

const LocalAssignmentInput = ({ value, onSave, existingAssignments }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);

    const handleCommit = () => {
        if (local === value) return;
        const normalized = local.replace(/\s+/g, ' ').trim();
        if (!normalized) { onSave(""); return; }
        
        const parts = normalized.split(';');
        for (let part of parts) {
            const colonIdx = part.indexOf(':');
            if (colonIdx !== -1) {
                const subName = part.substring(0, colonIdx).trim();
                const clsPart = part.substring(colonIdx + 1);
                const classes = clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c);
                for (let cls of classes) {
                    if (!isValidClassName(cls)) {
                        alert(`Lỗi: Lớp "${cls}" sai định dạng khối 6-9.`);
                        setLocal(value); return;
                    }
                    const assignmentKey = `${subName}:${cls}`;
                    if (existingAssignments[assignmentKey]) {
                        alert(`Lỗi: Môn ${subName} tại lớp ${cls} đã được phân công cho ${existingAssignments[assignmentKey]}.`);
                        setLocal(value); return;
                    }
                }
            }
        }
        onSave(normalized);
    };

    return (
        <input 
            type="text" 
            className="w-full p-2.5 rounded-xl border-none font-medium text-sm shadow-inner bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
            value={local} onChange={(e) => setLocal(e.target.value)} onBlur={handleCommit}
            onKeyDown={(e) => { if(e.key === 'Enter') handleCommit(); }}
            placeholder="Môn: Lớp1, Lớp2..."
        />
    );
};

// --- TAB COMPONENTS ---

const TeacherTab = ({ data, currentWeek, setCurrentWeek, updateWeekData, getWeekData, getTKBPeriods }: any) => {
    const [isAdding, setIsAdding] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClasses, setSelectedClasses] = useState("");
    
    // Draft State cho Tuần hiện tại
    const [draftWeek, setDraftWeek] = useState(() => getWeekData(currentWeek));
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setDraftWeek(getWeekData(currentWeek));
        setIsDirty(false);
    }, [currentWeek, getWeekData]);

    const { teachers, assignments, logs = {} } = draftWeek;
    const prevWeekData = getWeekData(currentWeek - 1);

    const fullAssignmentMap = useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(assignments).forEach(([tId, str]) => {
            if (!str) return;
            const t = data.masterTeachers.find((x: any) => x.id === tId);
            const name = t ? t.name : "GV khác";
            (str as string).split(';').forEach(p => {
                const cIdx = p.indexOf(':');
                if (cIdx !== -1) {
                    const sub = p.substring(0, cIdx).trim();
                    p.substring(cIdx + 1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                        map[`${sub}:${cls}`] = name;
                    });
                }
            });
        });
        return map;
    }, [assignments, data.masterTeachers]);

    const handleCommitChanges = () => {
        updateWeekData(currentWeek, draftWeek);
        setIsDirty(false);
        alert(`Đã lưu thay đổi Tuần ${currentWeek} thành công!`);
    };

    const copySelectedFromPrevious = () => {
        const newTeachers = [...prevWeekData.teachers];
        const newAssignments = { ...prevWeekData.assignments };
        const newLogs = { ...prevWeekData.logs };
        setDraftWeek({ teachers: newTeachers, assignments: newAssignments, logs: newLogs });
        setIsDirty(true);
        setIsCopying(false);
        alert("Đã sao chép nội dung tuần trước vào bản nháp!");
    };

    return (
        <div className="p-8 animate-fadeIn">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
                    <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                    <div className="px-6 text-center border-x border-slate-100">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Tuần học</div>
                        <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                    </div>
                    <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronRight size={20}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isDirty && (
                        <button onClick={handleCommitChanges} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-emerald-700 transition-all text-[11px] uppercase tracking-widest border border-emerald-500">
                            <Save size={16}/> Lưu thay đổi Tuần {currentWeek}
                        </button>
                    )}
                    <button onClick={() => setIsCopying(true)} className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-black transition-all text-[11px] uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200"><Copy size={16}/> Lấy tuần cũ</button>
                    <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-blue-700 transition-all text-[11px] uppercase tracking-widest">{isAdding ? 'Đóng' : 'Phân công Môn mới'}</button>
                </div>
            </div>

            {isAdding && (
                <div className="mb-10 bg-white border-4 border-blue-50 p-8 rounded-[2rem] animate-fadeIn shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2 italic"><PlusCircle size={18} className="text-blue-600"/> Thêm phân công giảng dạy (Bản nháp)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Giáo viên</label>
                            <select 
                                className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner text-base text-slate-700"
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                            >
                                <option value="">-- Chọn Giáo viên --</option>
                                {data.masterTeachers.map((mt: any) => (
                                    <option key={mt.id} value={mt.id}>{mt.name} ({mt.id})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Môn học</label>
                            <select 
                                className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner text-base"
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                            >
                                <option value="">-- Chọn Môn --</option>
                                {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Lớp (phẩy để ngăn cách)</label>
                            <input 
                                type="text" 
                                placeholder="6A, 6B..." 
                                className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner text-base"
                                value={selectedClasses}
                                onChange={(e) => setSelectedClasses(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-8 gap-3">
                        <button onClick={() => {
                            if (!selectedTeacherId || !selectedSubject || !selectedClasses) return alert("Vui lòng điền đủ thông tin!");
                            
                            const clsList = selectedClasses.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                            for (let c of clsList) {
                                if(!isValidClassName(c)) return alert(`Lớp ${c} sai định dạng.`);
                                const key = `${selectedSubject}:${c}`;
                                if(fullAssignmentMap[key]) return alert(`Môn ${selectedSubject} tại lớp ${c} đã được giao cho ${fullAssignmentMap[key]}!`);
                            }
                            
                            const currentAssigned = assignments[selectedTeacherId] || "";
                            const newPart = `${selectedSubject}: ${clsList.join(', ')}`;
                            const updatedAssigned = currentAssigned ? `${currentAssigned}; ${newPart}` : newPart;

                            const isNewInWeek = !teachers.some((t: any) => t.id === selectedTeacherId);
                            const masterT = data.masterTeachers.find((x: any) => x.id === selectedTeacherId);

                            setDraftWeek({
                                ...draftWeek,
                                teachers: isNewInWeek ? [...teachers, masterT] : teachers,
                                assignments: { ...assignments, [selectedTeacherId]: updatedAssigned }
                            });
                            setIsDirty(true);
                            setSelectedSubject(""); setSelectedClasses(""); setIsAdding(false);
                        }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Ghi nháp</button>
                    </div>
                </div>
            )}

            {isCopying && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-fadeIn">
                        <h3 className="text-xl font-black text-slate-800 mb-4">Lấy lại phân công cũ?</h3>
                        <p className="text-slate-500 text-sm mb-8">Nội dung tuần trước sẽ được điền vào bảng hiện tại nhưng chưa được lưu chính thức.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsCopying(false)} className="flex-1 p-4 bg-slate-100 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-400">Hủy bỏ</button>
                            <button onClick={copySelectedFromPrevious} className="flex-1 p-4 bg-blue-600 rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-lg">Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="p-5">ID & Giáo viên</th>
                            <th className="p-5 w-1/3">Phân công chi tiết (Môn: Lớp)</th>
                            <th className="p-5 text-center">Tiết TKB</th>
                            <th className="p-5 text-center text-orange-600">Dạy bù</th>
                            <th className="p-5 text-center text-orange-600">Tăng tiết</th>
                            <th className="p-5 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map((t: any) => {
                            const assignment = assignments[t.id] || "";
                            const tkb = getTKBPeriods(assignment);
                            const log = logs[t.id] || { bu: 0, tang: 0 };
                            const others: Record<string, string> = {};
                            Object.entries(assignments).forEach(([id, s]) => {
                                if (id === t.id || !s) return;
                                (s as string).split(';').forEach(p => {
                                    const cIdx = p.indexOf(':');
                                    if (cIdx !== -1) {
                                        const sub = p.substring(0, cIdx).trim();
                                        p.substring(cIdx+1).split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                                            const otherT = data.masterTeachers.find((x: any) => x.id === id);
                                            others[`${sub}:${cls}`] = otherT ? otherT.name : "GV khác";
                                        });
                                    }
                                });
                            });

                            return (
                                <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                    <td className="p-5">
                                        <div className="font-bold text-slate-400 text-[10px] mb-1 leading-none">{t.id}</div>
                                        <div className="font-black text-slate-800 text-base leading-none mb-1.5">{t.name}</div>
                                        <div className="flex flex-wrap gap-1.5">{(t.roles || []).map((r: string) => <span key={r} className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-tighter">{r}</span>)}</div>
                                    </td>
                                    <td className="p-5">
                                        <LocalAssignmentInput value={assignment} onSave={(v: string) => { setDraftWeek({ ...draftWeek, assignments: { ...assignments, [t.id]: v } }); setIsDirty(true); }} existingAssignments={others} />
                                    </td>
                                    <td className="p-5 text-center font-black text-slate-800 text-xl tracking-tighter">{tkb.toFixed(1)}</td>
                                    <td className="p-5">
                                        <LocalNumericInput value={log.bu} onChange={(val: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...log, bu: val } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 outline-none text-sm shadow-inner"/>
                                    </td>
                                    <td className="p-5">
                                        <LocalNumericInput value={log.tang} onChange={(val: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...log, tang: val } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 outline-none text-sm shadow-inner"/>
                                    </td>
                                    <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { if(confirm(`Xóa tạm thời phân công tuần này của ${t.name}?`)) { setDraftWeek({ ...draftWeek, teachers: teachers.filter((x: any) => x.id !== t.id) }); setIsDirty(true); } }} className="text-slate-200 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={20}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {isDirty && (
                <div className="fixed bottom-10 right-10 z-[60] animate-bounce">
                    <button onClick={handleCommitChanges} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 transition-all border-4 border-white">
                        <Save size={24}/> LƯU THAY ĐỔI NGAY
                    </button>
                </div>
            )}
        </div>
    );
};

const WeeklyTab = ({ data, startRange, setStartRange, endRange, setEndRange, getTKBPeriods }: any) => {
    const stats = useMemo(() => {
        const aggregates: Record<string, any> = {};
        for (let w = startRange; w <= endRange; w++) {
            const record = data.weeklyRecords[w]; if (!record) continue;
            record.teachers.forEach((t: any) => {
                const key = t.id;
                if (!aggregates[key]) aggregates[key] = { id: t.id, name: t.name, tkb: 0, bu: 0, tang: 0 };
                const log = record.logs?.[t.id] || { bu: 0, tang: 0 };
                aggregates[key].tkb += (log.actual !== undefined ? log.actual : getTKBPeriods(record.assignments[t.id] || ""));
                aggregates[key].bu += (log.bu || 0); aggregates[key].tang += (log.tang || 0);
            });
        }
        return Object.values(aggregates).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [data, startRange, endRange, getTKBPeriods]);

    return (
        <div className="p-8 animate-fadeIn">
            <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 px-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Từ tuần</label>
                        <input type="number" min="1" value={startRange} onChange={e => setStartRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-xl font-black text-center text-sm text-blue-600 border-none outline-none"/>
                    </div>
                    <ChevronRight className="text-slate-200" size={20} />
                    <div className="flex items-center gap-3 px-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest">Đến tuần</label>
                        <input type="number" min={startRange} value={endRange || 1} onChange={e => setEndRange(parseInt(e.target.value) || 1)} className="w-14 p-2 bg-slate-50 rounded-xl font-black text-center text-sm text-blue-600 border-none outline-none"/>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="p-6">ID & Họ tên giáo viên</th>
                            <th className="p-6 text-center">Tổng Tiết TKB</th>
                            <th className="p-6 text-center text-orange-600">Tổng dạy bù</th>
                            <th className="p-6 text-center text-orange-600">Tổng tăng tiết</th>
                            <th className="p-6 text-center bg-blue-50/50 text-blue-700">Thực dạy Lũy kế</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {stats.map((s: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-5">
                                    <div className="text-[9px] font-bold text-slate-300">{s.id}</div>
                                    <div className="font-black text-slate-700 text-base">{s.name}</div>
                                </td>
                                <td className="p-5 text-center font-black text-slate-400 text-lg tracking-tight">{s.tkb.toFixed(1)}</td>
                                <td className="p-5 text-center font-black text-orange-600 text-lg tracking-tight">{s.bu.toFixed(1)}</td>
                                <td className="p-5 text-center font-black text-orange-600 text-lg tracking-tight">{s.tang.toFixed(1)}</td>
                                <td className="p-5 text-center bg-blue-50/20 font-black text-blue-700 text-3xl tracking-tighter">{(s.tkb + s.bu + s.tang).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ReportTab = ({ data, startRange, endRange, getTKBPeriods, getTeacherReduction }: any) => {
    const [repRange, setRepRange] = useState({ s: startRange, e: endRange });
    useEffect(() => { setRepRange({ s: startRange, e: endRange }); }, [startRange, endRange]);

    const teacherStats = useMemo(() => {
        const map: Record<string, any> = {};
        const numWeeks = (repRange.e - repRange.s + 1);
        if (numWeeks <= 0) return [];
        for (let w = repRange.s; w <= repRange.e; w++) {
            const rec = data.weeklyRecords[w]; if (!rec) continue;
            rec.teachers.forEach((t: any) => {
                const k = t.id;
                if (!map[k]) map[k] = { name: t.name, quotaPerW: 0, actual: 0, extra: 0, roles: t.roles };
                map[k].quotaPerW = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                const log = rec.logs?.[t.id] || { bu: 0, tang: 0 };
                map[k].actual += (log.actual !== undefined ? log.actual : getTKBPeriods(rec.assignments[t.id] || ""));
                map[k].extra += (log.bu || 0) + (log.tang || 0);
            });
        }
        return Object.values(map).map((s: any) => ({
            ...s,
            progQuota: s.quotaPerW * numWeeks,
            total: s.actual + s.extra,
            bal: (s.actual + s.extra) - (s.quotaPerW * numWeeks)
        })).sort((a,b) => a.name.localeCompare(b.name));
    }, [data, repRange, getTKBPeriods, getTeacherReduction]);

    const subjStats = useMemo(() => {
        const numWeeksRange = (repRange.e - repRange.s + 1);
        const classCounts = data.gradeClassCounts || { p6: 0, p7: 0, p8: 0, p9: 0 };
        
        const mainSubjectsSet = new Set<string>();
        data.subjectConfigs.forEach((s: any) => {
            if (s.parent) mainSubjectsSet.add(s.parent);
            else mainSubjectsSet.add(s.name);
        });
        const mainSubjects = Array.from(mainSubjectsSet);
        
        return mainSubjects.map(subName => {
            const configs = data.subjectConfigs.filter((s: any) => s.name === subName || s.parent === subName);
            
            let weeklyQuota = 0;
            configs.forEach((s: any) => {
                weeklyQuota += 
                    (classCounts.p6 * (s.p6 || 0)) + 
                    (classCounts.p7 * (s.p7 || 0)) + 
                    (classCounts.p8 * (s.p8 || 0)) + 
                    (classCounts.p9 * (s.p9 || 0));
            });

            let actualYTD = 0;
            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                Object.entries(rec.assignments).forEach(([tid, str]: any) => {
                    (str || "").split(';').forEach((p:any) => {
                        const [partSub, clsPart] = p.split(':');
                        const assignedSubName = partSub?.trim();
                        const subConf = data.subjectConfigs.find((x: any) => x.name === assignedSubName);
                        
                        if (assignedSubName === subName || subConf?.parent === subName) {
                            let teacherWeekTKB = 0;
                            clsPart.split(',').forEach((c:any) => {
                                const g = c.trim().match(/^[6-9]/)?.[0];
                                if (g) teacherWeekTKB += Number(subConf?.[`p${g}`] || 0);
                            });
                            const log = rec.logs?.[tid] || { bu: 0, tang: 0 };
                            actualYTD += teacherWeekTKB + (log.bu || 0) + (log.tang || 0);
                        }
                    });
                });
            }

            const qTargetL = weeklyQuota * numWeeksRange;
            const qYear = weeklyQuota * 35;
            const pctProgress = qTargetL > 0 ? (actualYTD / qTargetL) * 100 : 0;
            const pctYear = qYear > 0 ? (actualYTD / qYear) * 100 : 0;

            return { name: subName, qTargetL, qYear, actualYTD, pctProgress, pctYear, weeklyQuota };
        }).filter(x => x.weeklyQuota > 0).sort((a, b) => b.pctProgress - a.pctProgress);
    }, [data, repRange]);

    return (
        <div className="p-8 animate-fadeIn space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 italic">Khoảng báo cáo:</span>
                    <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none text-sm"/>
                    <span className="text-slate-300">→</span>
                    <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none text-sm"/>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto h-fit">
                        <div className="p-5 border-b bg-slate-50/50 flex items-center gap-2">
                            <Users size={18} className="text-blue-600" />
                            <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest italic">Thống kê định mức từng Giáo viên</h3>
                        </div>
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr>
                                    <th className="p-5 w-10 text-center">STT</th>
                                    <th className="p-5">Họ tên Giáo viên</th>
                                    <th className="p-5 text-center">Định mức TL</th>
                                    <th className="p-5 text-center">Tích lũy</th>
                                    <th className="p-5 text-center text-blue-600">Thừa/Thiếu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {teacherStats.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-center text-slate-300 font-black text-sm">{i+1}</td>
                                        <td className="p-4 font-black text-slate-700 text-base">{s.name}</td>
                                        <td className="p-4 text-center text-slate-400 font-black text-base">{s.progQuota.toFixed(1)}</td>
                                        <td className="p-4 text-center text-slate-800 font-black text-base">{s.total.toFixed(1)}</td>
                                        <td className={`p-4 text-center text-xl font-black tracking-tighter ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl p-6 space-y-6 overflow-hidden h-fit">
                    <div className="flex items-center gap-2 border-b pb-4">
                        <BookOpen size={20} className="text-blue-600" />
                        <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest italic">Tiến độ theo Môn học linh hoạt</h3>
                    </div>
                    <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 no-scrollbar">
                        {subjStats.map((s: any, i: number) => (
                            <div key={i} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className="font-black text-slate-700 text-sm italic">{s.name}</div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-blue-600">{s.actualYTD.toFixed(1)} tiết</div>
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Lũy kế thực dạy</div>
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                        <span>Tiến độ ({repRange.e - repRange.s + 1} tuần)</span>
                                        <span className={s.pctProgress >= 100 ? 'text-emerald-600' : 'text-orange-600'}>{s.pctProgress.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                        <div className={`h-full transition-all duration-1000 ${s.pctProgress >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, s.pctProgress)}%` }}></div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                        <span>So với 35 tuần</span>
                                        <span className="text-blue-600">{s.pctYear.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, s.pctYear)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfigTab = ({ data, updateData }: any) => {
    // Local Draft State cho toàn bộ Config
    const [localDraft, setLocalDraft] = useState({
        masterTeachers: [...data.masterTeachers],
        roles: [...data.roles],
        standardQuota: data.standardQuota,
        gradeClassCounts: { ...data.gradeClassCounts },
        subjectConfigs: [...data.subjectConfigs.map((s: any) => ({ ...s }))]
    });
    const [isDirty, setIsDirty] = useState(false);

    const [newName, setNewName] = useState('');
    const [newTeacherRoles, setNewTeacherRoles] = useState<string[]>([]);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleReduction, setNewRoleReduction] = useState(0);

    const tFileRef = useRef<HTMLInputElement>(null);

    const generateTeacherId = useCallback(() => {
        const ids = localDraft.masterTeachers.map((t: any) => {
            const match = t.id.match(/^GV(\d+)$/);
            return match ? parseInt(match[1]) : 0;
        });
        const maxId = Math.max(...ids, 0);
        return `GV${(maxId + 1).toString().padStart(3, '0')}`;
    }, [localDraft.masterTeachers]);

    const handleAddTeacher = () => {
        if (!newName.trim()) return;
        const newT = { 
            id: generateTeacherId(), 
            name: newName.trim(), 
            roles: [...newTeacherRoles] 
        };
        setLocalDraft({ ...localDraft, masterTeachers: [...localDraft.masterTeachers, newT] });
        setIsDirty(true);
        setNewName(''); setNewTeacherRoles([]);
    };

    const handleAddRole = () => {
        if (!newRoleName.trim()) return;
        const newRole = { id: `r_${Date.now()}`, name: newRoleName.trim(), reduction: newRoleReduction };
        setLocalDraft({ ...localDraft, roles: [...localDraft.roles, newRole] });
        setIsDirty(true);
        setNewRoleName(''); setNewRoleReduction(0);
    };

    const handleSaveConfig = () => {
        updateData(localDraft);
        setIsDirty(false);
        alert("Cấu hình hệ thống đã được cập nhật chính thức!");
    };

    return (
        <div className="p-8 animate-fadeIn space-y-12 pb-24">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2">
                    <Settings className="text-blue-600" /> CÀI ĐẶT HỆ THỐNG {isDirty && <span className="text-[10px] bg-orange-100 text-orange-600 px-3 py-1 rounded-full ml-4 animate-pulse">● ĐANG CÓ BẢN NHÁP</span>}
                </h2>
                {isDirty && (
                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-emerald-700 transition-all">
                        <Save size={18}/> Lưu cấu hình mới
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight flex items-center gap-2">
                        <Users className="text-blue-600" /> Quản lý Nhân sự Master
                    </h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-50 shadow-xl space-y-6">
                        <div className="flex flex-col gap-4">
                            <input type="text" placeholder="Họ tên Giáo viên..." value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold border-none outline-none shadow-inner"/>
                            <div className="relative">
                                <div onClick={() => setShowRoleMenu(!showRoleMenu)} className="w-full p-4 bg-slate-50 rounded-xl font-black text-slate-500 text-xs flex justify-between items-center cursor-pointer shadow-inner mt-1">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chọn chức vụ...'}</span>
                                    <ChevronDown size={18} className="text-blue-500" />
                                </div>
                                {showRoleMenu && (
                                    <div className="absolute top-[105%] left-0 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 p-3 max-h-48 overflow-y-auto">
                                        {localDraft.roles.map((r: any) => (
                                            <div key={r.id} onClick={() => setNewTeacherRoles(prev => prev.includes(r.name) ? prev.filter(x => x !== r.name) : [...prev, r.name])} className="p-2.5 rounded-lg mb-1 cursor-pointer flex items-center justify-between hover:bg-blue-50">
                                                <span className="font-black text-[11px]">{r.name}</span>
                                                {newTeacherRoles.includes(r.name) && <Check size={16} className="text-blue-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleAddTeacher} className="bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><UserPlus size={18}/> Thêm vào bản nháp</button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto pr-2 no-scrollbar space-y-3 pt-6 border-t">
                            {localDraft.masterTeachers.map((mt: any) => (
                                <div key={mt.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-blue-100">
                                    <div><div className="font-black text-slate-700 text-sm">{mt.name}</div><div className="text-[9px] text-slate-300 font-bold uppercase">{mt.id}</div></div>
                                    <button onClick={() => { setLocalDraft({ ...localDraft, masterTeachers: localDraft.masterTeachers.filter((x:any)=>x.id !== mt.id) }); setIsDirty(true); }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tight flex items-center gap-2">
                        <Briefcase className="text-blue-600" /> Danh mục Chức vụ
                    </h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-50 shadow-xl space-y-6">
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-3 gap-3">
                                <input type="text" placeholder="Tên Chức vụ..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="col-span-2 p-4 bg-slate-50 rounded-xl font-bold outline-none shadow-inner"/>
                                <input type="number" value={newRoleReduction} onChange={e => setNewRoleReduction(parseFloat(e.target.value) || 0)} className="p-4 bg-slate-50 rounded-xl font-bold outline-none shadow-inner text-center"/>
                            </div>
                            <button onClick={handleAddRole} className="bg-slate-800 text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 shadow-lg transition-all"><Plus size={18}/> Thêm chức vụ mới</button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto pr-2 no-scrollbar space-y-3 pt-6 border-t">
                            {localDraft.roles.map((r: any) => (
                                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group">
                                    <div><div className="font-black text-slate-700 text-sm">{r.name}</div><div className="text-[9px] text-blue-500 font-bold uppercase">Giảm: {r.reduction} tiết</div></div>
                                    <button onClick={() => { setLocalDraft({ ...localDraft, roles: localDraft.roles.filter((x:any)=>x.id !== r.id) }); setIsDirty(true); }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {isDirty && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fadeIn">
                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-12 py-5 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 transition-all border-4 border-white scale-110">
                        <Save size={28}/> XÁC NHẬN LƯU TẤT CẢ CẤU HÌNH
                    </button>
                </div>
            )}
        </div>
    );
};

// --- APP CHÍNH ---
const App = () => {
    const [activeTab, setActiveTab] = useState('teachers');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [startRange, setStartRange] = useState(1);
    const [endRange, setEndRange] = useState(1);

    const [data, setData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
        return { 
            standardQuota: 19, 
            roles: DEFAULT_ROLES,
            subjectConfigs: DEFAULT_SUBJECT_CONFIGS,
            gradeClassCounts: { p6: 1, p7: 1, p8: 1, p9: 1 },
            masterTeachers: [], 
            weeklyRecords: {} 
        };
    });

    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);

    const updateData = useCallback((newData: any) => setData((prev: any) => ({ ...prev, ...newData })), []);
    const getWeekData = useCallback((week: number) => data.weeklyRecords[week] || { teachers: [], assignments: {}, logs: {} }, [data.weeklyRecords]);
    const updateWeekData = useCallback((week: number, weekContent: any) => {
        setData((prev: any) => ({
            ...prev,
            weeklyRecords: { 
                ...prev.weeklyRecords, 
                [week]: weekContent 
            }
        }));
    }, []);

    const getTKBPeriods = useMemo(() => {
        const configMap = new Map<string, any>();
        data.subjectConfigs.forEach((s: any) => configMap.set(String(s.name).toLowerCase(), s));
        return (assignmentStr: string) => {
            if (!assignmentStr) return 0;
            let total = 0;
            assignmentStr.split(';').forEach(part => {
                const [subName, clsPart] = part.split(':');
                if (subName && clsPart) {
                    const subConfig = configMap.get(subName.trim().toLowerCase());
                    if (subConfig) {
                        clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                            const gradeMatch = cls.match(/^[6-9]/);
                            if (gradeMatch) total += Number(subConfig[`p${gradeMatch[0]}`] || 0);
                        });
                    }
                }
            });
            return total;
        };
    }, [data.subjectConfigs]);

    const getTeacherReduction = useMemo(() => (teacherRoles: string[]) => {
        return (teacherRoles || []).reduce((sum, roleName) => {
            const r = data.roles.find((x: any) => x.name === roleName);
            return sum + (r ? r.reduction : 0);
        }, 0);
    }, [data.roles]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-800">
            <header className="bg-white border-b border-slate-100 p-3 sticky top-0 z-50 shadow-sm">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-xl rotate-2"><LayoutDashboard size={24}/></div>
                        <div>
                            <h1 className="font-black text-xl tracking-tighter text-slate-800 uppercase italic leading-none">GIẢNG DẠY THCS <span className="text-blue-600 text-[10px] align-top font-black italic">PRO v9.3</span></h1>
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1 italic leading-none">Management System</p>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-2xl shadow-inner">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
                            {id: 'weekly', icon: CalendarDays, label: 'Thực dạy'},
                            {id: 'reports', icon: FileText, label: 'Báo cáo'},
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon size={18}/> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8 flex-1">
                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white min-h-[750px] overflow-hidden relative">
                    {activeTab === 'config' && <ConfigTab data={data} updateData={updateData} />}
                    {activeTab === 'teachers' && <TeacherTab data={data} currentWeek={currentWeek} setCurrentWeek={setCurrentWeek} updateWeekData={updateWeekData} getWeekData={getWeekData} getTKBPeriods={getTKBPeriods} />}
                    {activeTab === 'weekly' && <WeeklyTab data={data} startRange={startRange} setStartRange={setStartRange} endRange={endRange} setEndRange={setEndRange} getTKBPeriods={getTKBPeriods} />}
                    {activeTab === 'reports' && <ReportTab data={data} startRange={startRange} endRange={endRange} getTKBPeriods={getTKBPeriods} getTeacherReduction={getTeacherReduction} />}
                </div>
            </main>
            <footer className="p-8 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] italic flex items-center justify-center gap-3">
                <UserCheck size={16}/> Professional Edition • v9.3
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
