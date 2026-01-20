
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
const STORAGE_KEY = 'thcs_teaching_mgmt_v9_4_pro';

const FLEXIBLE_SUBJECTS = [
    'KHTN1', 'KHTN2', 'KHTN3', 
    'HĐTN1', 'HĐTN2', 'HĐTN3', 
    'GDĐP'
];

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
    // Môn linh hoạt không cần số tiết/tuần cố định
    { name: 'KHTN1', isFlex: true },
    { name: 'KHTN2', isFlex: true },
    { name: 'KHTN3', isFlex: true },
    { name: 'HĐTN1', isFlex: true },
    { name: 'HĐTN2', isFlex: true },
    { name: 'HĐTN3', isFlex: true },
    { name: 'GDĐP', isFlex: true, yearly: { p6: 35, p7: 35, p8: 35, p9: 35 } }
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
const LocalNumericInput = ({ value, onChange, className, step = 0.5, placeholder = "" }: any) => {
    const [local, setLocal] = useState(value);
    useEffect(() => { setLocal(value); }, [value]);
    return (
        <input 
            type="number" step={step} className={className} 
            value={local} 
            placeholder={placeholder}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => onChange(parseFloat(local) || 0)}
            onKeyDown={(e) => { if(e.key === 'Enter') onChange(parseFloat(local) || 0); }}
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
    const [flexPeriods, setFlexPeriods] = useState("");
    
    const [draftWeek, setDraftWeek] = useState(() => getWeekData(currentWeek));
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setDraftWeek(getWeekData(currentWeek));
        setIsDirty(false);
    }, [currentWeek, getWeekData]);

    const { teachers, assignments, logs = {} } = draftWeek;
    const prevWeekData = getWeekData(currentWeek - 1);

    const isCurrentSubFlex = FLEXIBLE_SUBJECTS.includes(selectedSubject);

    const handleCommitChanges = () => {
        updateWeekData(currentWeek, draftWeek);
        setIsDirty(false);
        alert(`Đã lưu Tuần ${currentWeek}!`);
    };

    const exportAllWeeks = () => {
        const wb = XLSX.utils.book_new();
        const weeks = Object.keys(data.weeklyRecords).map(Number).sort((a,b) => a-b);
        
        if (weeks.length === 0) return alert("Chưa có dữ liệu tuần nào để xuất!");

        weeks.forEach(w => {
            const rec = data.weeklyRecords[w];
            const sheetData = rec.teachers.map((t: any) => ({
                "ID": t.id,
                "Họ tên": t.name,
                "Chức vụ": (t.roles || []).join(', '),
                "Phân công": rec.assignments[t.id] || "",
                "Tiết TKB": getTKBPeriods(rec.assignments[t.id] || ""),
                "Dạy bù": rec.logs?.[t.id]?.bu || 0,
                "Tăng tiết": rec.logs?.[t.id]?.tang || 0
            }));
            const ws = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, `Tuan ${w}`);
        });

        XLSX.writeFile(wb, `Phan_Cong_Giang_Day_Full_Weeks.xlsx`);
    };

    return (
        <div className="p-8 animate-fadeIn pb-24">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
                    <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronLeft size={20}/></button>
                    <div className="px-6 text-center border-x border-slate-100">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Tuần học</div>
                        <div className="text-2xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                    </div>
                    <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"><ChevronRight size={20}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportAllWeeks} className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-[11px] uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100"><FileSpreadsheet size={16}/> Xuất Tất cả Tuần</button>
                    <button onClick={() => setIsCopying(true)} className="px-4 py-2.5 rounded-xl flex items-center gap-2 font-black text-[11px] uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200"><Copy size={16}/> Lấy tuần cũ</button>
                    <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-blue-700 text-[11px] uppercase tracking-widest">{isAdding ? 'Đóng' : 'Thêm Phân công'}</button>
                </div>
            </div>

            {isAdding && (
                <div className="mb-10 bg-white border-4 border-blue-50 p-8 rounded-[2rem] animate-fadeIn shadow-2xl relative">
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 italic">Ghi nháp Phân công mới</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</label>
                            <select className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                                <option value="">-- Chọn GV --</option>
                                {data.masterTeachers.map((mt: any) => <option key={mt.id} value={mt.id}>{mt.name} ({mt.id})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</label>
                            <select className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-black shadow-inner" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                                <option value="">-- Chọn Môn --</option>
                                {data.subjectConfigs.map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp (VD: 6A, 6B)</label>
                            <input type="text" placeholder="6A, 6B..." className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner" value={selectedClasses} onChange={(e) => setSelectedClasses(e.target.value)}/>
                        </div>
                        {isCurrentSubFlex && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Số tiết linh hoạt</label>
                                <input type="number" step="0.5" placeholder="Nhập số tiết..." className="w-full p-4 rounded-xl bg-orange-50 border-2 border-orange-100 outline-none font-black shadow-inner" value={flexPeriods} onChange={(e) => setFlexPeriods(e.target.value)}/>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-8 gap-3">
                        <button onClick={() => {
                            if (!selectedTeacherId || !selectedSubject || !selectedClasses) return alert("Vui lòng điền đủ thông tin!");
                            const clsList = selectedClasses.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                            
                            // Build assignment string
                            let newPart = "";
                            if (isCurrentSubFlex) {
                                newPart = `${selectedSubject}[${flexPeriods || 0}]: ${clsList.join(', ')}`;
                            } else {
                                newPart = `${selectedSubject}: ${clsList.join(', ')}`;
                            }

                            const currentAssigned = assignments[selectedTeacherId] || "";
                            const updatedAssigned = currentAssigned ? `${currentAssigned}; ${newPart}` : newPart;

                            const isNewInWeek = !teachers.some((t: any) => t.id === selectedTeacherId);
                            const masterT = data.masterTeachers.find((x: any) => x.id === selectedTeacherId);

                            setDraftWeek({
                                ...draftWeek,
                                teachers: isNewInWeek ? [...teachers, masterT] : teachers,
                                assignments: { ...assignments, [selectedTeacherId]: updatedAssigned }
                            });
                            setIsDirty(true);
                            setSelectedSubject(""); setSelectedClasses(""); setFlexPeriods("");
                        }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg">Ghi nháp</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="p-5">Giáo viên</th>
                            <th className="p-5 w-1/3">Phân công (Môn: Lớp)</th>
                            <th className="p-5 text-center">Tiết TKB</th>
                            <th className="p-5 text-center text-orange-600">Dạy bù</th>
                            <th className="p-5 text-center text-orange-600">Tăng tiết</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map((t: any) => {
                            const assignment = assignments[t.id] || "";
                            const tkb = getTKBPeriods(assignment);
                            const log = logs[t.id] || { bu: 0, tang: 0 };
                            return (
                                <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                    <td className="p-5">
                                        <div className="font-black text-slate-800 text-base">{t.name}</div>
                                        <div className="text-[9px] text-slate-300 font-bold uppercase">{t.id}</div>
                                    </td>
                                    <td className="p-5">
                                        <input type="text" className="w-full p-2.5 rounded-xl border-none font-medium text-sm shadow-inner bg-slate-50 text-slate-700" value={assignment} onChange={(e) => { setDraftWeek({ ...draftWeek, assignments: { ...assignments, [t.id]: e.target.value } }); setIsDirty(true); }} placeholder="Môn: Lớp1, Lớp2..."/>
                                    </td>
                                    <td className="p-5 text-center font-black text-slate-800 text-xl tracking-tighter">{tkb.toFixed(1)}</td>
                                    <td className="p-5"><LocalNumericInput value={log.bu} onChange={(v: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...log, bu: v } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 text-sm shadow-inner"/></td>
                                    <td className="p-5"><LocalNumericInput value={log.tang} onChange={(v: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...log, tang: v } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-2.5 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 text-sm shadow-inner"/></td>
                                    <td className="p-5 text-right opacity-0 group-hover:opacity-100"><button onClick={() => { if(confirm(`Xóa GV ${t.name}?`)) { setDraftWeek({ ...draftWeek, teachers: teachers.filter((x:any)=>x.id!==t.id)}); setIsDirty(true); } }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {isDirty && (
                <div className="fixed bottom-10 right-10 z-[60]">
                    <button onClick={handleCommitChanges} className="bg-emerald-600 text-white px-10 py-4 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 border-4 border-white transition-all scale-110">
                        <Save size={24}/> LƯU TUẦN {currentWeek}
                    </button>
                </div>
            )}
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
                if (!map[k]) map[k] = { id: t.id, name: t.name, quotaPerW: 0, actual: 0, extra: 0 };
                map[k].quotaPerW = Math.max(0, data.standardQuota - getTeacherReduction(t.roles));
                const log = rec.logs?.[t.id] || { bu: 0, tang: 0 };
                map[k].actual += getTKBPeriods(rec.assignments[t.id] || "");
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

    const exportProgressReport = () => {
        const wsData = teacherStats.map((s: any, i) => ({
            "STT": i + 1,
            "Mã GV": s.id,
            "Họ tên": s.name,
            "Định mức tích lũy": s.progQuota.toFixed(1),
            "Thực dạy tích lũy": s.total.toFixed(1),
            "Thừa/Thiếu": s.bal.toFixed(1)
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bao Cao Tien Do");
        XLSX.writeFile(wb, `Bao_Cao_Tien_Do_Tuan_${repRange.s}_den_${repRange.e}.xlsx`);
    };

    return (
        <div className="p-8 animate-fadeIn space-y-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400">Khoảng xem:</span>
                    <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600"/>
                    <span className="text-slate-300">→</span>
                    <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-14 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600"/>
                </div>
                <button onClick={exportProgressReport} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><FileDown size={18}/> Xuất Báo cáo</button>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden overflow-x-auto h-fit">
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
                                <td className={`p-4 text-center text-xl font-black tracking-tighter ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ConfigTab = ({ data, updateData }: any) => {
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
    const sysFileRef = useRef<HTMLInputElement>(null);

    const generateTeacherId = useCallback(() => {
        const ids = localDraft.masterTeachers.map((t: any) => {
            const match = t.id.match(/^GV(\d+)$/);
            return match ? parseInt(match[1]) : 0;
        });
        const maxId = Math.max(...ids, 0);
        return `GV${(maxId + 1).toString().padStart(3, '0')}`;
    }, [localDraft.masterTeachers]);

    const handleSaveConfig = () => { updateData(localDraft); setIsDirty(false); alert("Đã cập nhật hệ thống!"); };

    const exportSystemJSON = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `he_thong_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const importSystemExcel = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            // Khôi phục MasterTeachers từ Sheet đầu tiên
            const gvRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const newTs = gvRows.map((r: any, i) => ({
                id: r["Mã GV"] || r["ID"] || `GV_NEW_${i}`,
                name: r["Họ tên"] || r["Họ và tên"],
                roles: (r["Chức vụ"] || "").split(",").map((s:any)=>s.trim()).filter((s:any)=>s)
            }));
            setLocalDraft(prev => ({ ...prev, masterTeachers: newTs }));
            setIsDirty(true);
            alert("Đã nhập danh sách nhân sự từ Excel. Nhấn 'Lưu cấu hình' để hoàn tất.");
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-8 animate-fadeIn space-y-12 pb-32">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><Settings className="text-blue-600" /> CÀI ĐẶT HỆ THỐNG</h2>
                <div className="flex gap-2">
                    <button onClick={exportSystemJSON} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="Sao lưu JSON"><Download size={20}/></button>
                    <button onClick={() => sysFileRef.current?.click()} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Khôi phục từ Excel"><Upload size={20}/></button>
                    <input type="file" ref={sysFileRef} className="hidden" accept=".xlsx,.xls" onChange={importSystemExcel}/>
                    {isDirty && (
                        <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2"><Save size={18}/> Lưu cấu hình</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* NHÂN SỰ */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic flex items-center gap-2"><Users className="text-blue-600" /> Quản lý Nhân sự</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-50 shadow-xl space-y-6">
                        <div className="flex flex-col gap-4">
                            <input type="text" placeholder="Họ tên Giáo viên..." value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold shadow-inner outline-none"/>
                            <div className="relative">
                                <div onClick={() => setShowRoleMenu(!showRoleMenu)} className="w-full p-4 bg-slate-50 rounded-xl font-black text-slate-500 text-xs flex justify-between items-center cursor-pointer shadow-inner">
                                    <span className="truncate">{newTeacherRoles.length > 0 ? newTeacherRoles.join(', ') : 'Chọn chức vụ...'}</span>
                                    <ChevronDown size={18}/>
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
                            <button onClick={() => { if(!newName) return; setLocalDraft({...localDraft, masterTeachers: [...localDraft.masterTeachers, {id: generateTeacherId(), name: newName, roles: [...newTeacherRoles]}]}); setIsDirty(true); setNewName(''); setNewTeacherRoles([]); }} className="bg-blue-600 text-white p-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg"><UserPlus size={18}/> Thêm nhân sự</button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-3 pt-6 border-t no-scrollbar">
                            {localDraft.masterTeachers.map((mt: any) => (
                                <div key={mt.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group">
                                    <div><div className="font-black text-slate-700 text-sm">{mt.name}</div><div className="text-[9px] text-slate-300 font-bold uppercase">{mt.id}</div></div>
                                    <button onClick={() => { setLocalDraft({ ...localDraft, masterTeachers: localDraft.masterTeachers.filter((x:any)=>x.id !== mt.id) }); setIsDirty(true); }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CẤU HÌNH MÔN HỌC & GDĐP */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic flex items-center gap-2"><BookOpen className="text-blue-600" /> Cấu hình Môn học & GDĐP</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-50 shadow-xl space-y-8">
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block tracking-widest">Định mức chuẩn (Tiết/Tuần)</label>
                             <input type="number" value={localDraft.standardQuota} onChange={e => {setLocalDraft({...localDraft, standardQuota: parseFloat(e.target.value)||0}); setIsDirty(true);}} className="text-6xl font-black text-blue-600 bg-transparent outline-none w-full tracking-tighter"/>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 pb-8 border-b">
                            {['6', '7', '8', '9'].map(g => (
                                <div key={g} className="text-center">
                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-tight">Số lớp K{g}</label>
                                    <input type="number" value={localDraft.gradeClassCounts[`p${g}`]} onChange={e => {setLocalDraft({ ...localDraft, gradeClassCounts: { ...localDraft.gradeClassCounts, [`p${g}`]: parseInt(e.target.value) || 0 } }); setIsDirty(true);}} className="w-full p-3 bg-slate-50 rounded-xl text-center font-black text-slate-800 text-lg shadow-inner outline-none"/>
                                </div>
                            ))}
                         </div>

                        <div className="max-h-[400px] overflow-y-auto no-scrollbar space-y-4">
                            {localDraft.subjectConfigs.map((s: any, i: number) => (
                                <div key={i} className={`p-4 rounded-2xl border ${s.isFlex ? 'bg-orange-50/20 border-orange-100' : 'bg-white border-slate-50 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-black text-slate-700 text-xs italic">{s.name} {s.yearly ? '(Cấu hình Năm)' : ''}</div>
                                        {s.isFlex && <span className="bg-orange-100 text-orange-600 text-[8px] px-2 py-0.5 rounded uppercase font-black">Linh hoạt</span>}
                                    </div>
                                    {!s.isFlex ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            {['6', '7', '8', '9'].map(g => (
                                                <input key={g} type="number" step="0.5" value={s[`p${g}`]} onChange={e => { const nc = [...localDraft.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; setLocalDraft({...localDraft, subjectConfigs: nc}); setIsDirty(true); }} className="w-full p-2 bg-slate-50/50 rounded-lg text-center font-black text-blue-500 text-[10px] outline-none"/>
                                            ))}
                                        </div>
                                    ) : s.yearly ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            {['6', '7', '8', '9'].map(g => (
                                                <div key={g} className="text-center">
                                                    <div className="text-[8px] text-slate-300 font-bold">K{g}</div>
                                                    <input type="number" value={s.yearly[`p${g}`]} onChange={e => { const nc = [...localDraft.subjectConfigs]; nc[i].yearly[`p${g}`] = parseInt(e.target.value) || 0; setLocalDraft({...localDraft, subjectConfigs: nc}); setIsDirty(true); }} className="w-full p-2 bg-slate-50/50 rounded-lg text-center font-black text-orange-600 text-[10px] outline-none"/>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[9px] text-slate-400 font-bold italic uppercase">Nhập trực tiếp khi phân công</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
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
        setData((prev: any) => ({ ...prev, weeklyRecords: { ...prev.weeklyRecords, [week]: weekContent } }));
    }, []);

    const getTKBPeriods = useMemo(() => {
        const configMap = new Map<string, any>();
        data.subjectConfigs.forEach((s: any) => configMap.set(String(s.name).toLowerCase(), s));
        return (assignmentStr: string) => {
            if (!assignmentStr) return 0;
            let total = 0;
            assignmentStr.split(';').forEach(part => {
                const flexMatch = part.match(/(.+)\[([\d.]+)\]/);
                if (flexMatch) {
                    total += parseFloat(flexMatch[2]) || 0;
                } else {
                    const [subName, clsPart] = part.split(':');
                    if (subName && clsPart) {
                        const subConfig = configMap.get(subName.trim().toLowerCase());
                        if (subConfig && !subConfig.isFlex) {
                            clsPart.split(',').map(c => c.trim().replace(/\s/g, '')).filter(c => c).forEach(cls => {
                                const gradeMatch = cls.match(/^[6-9]/);
                                if (gradeMatch) total += Number(subConfig[`p${gradeMatch[0]}`] || 0);
                            });
                        }
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
                            <h1 className="font-black text-xl tracking-tighter text-slate-800 uppercase italic leading-none">GIẢNG DẠY THCS <span className="text-blue-600 text-[10px] align-top font-black italic">PRO v9.4</span></h1>
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-[0.2em] mt-1 italic leading-none">Management System</p>
                        </div>
                    </div>
                    <nav className="flex gap-1 bg-slate-100 p-1 rounded-2xl shadow-inner">
                        {[
                            {id: 'config', icon: Settings, label: 'Cài đặt'},
                            {id: 'teachers', icon: Users, label: 'Phân công'},
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
                    {activeTab === 'reports' && <ReportTab data={data} startRange={startRange} endRange={endRange} getTKBPeriods={getTKBPeriods} getTeacherReduction={getTeacherReduction} />}
                </div>
            </main>
            <footer className="p-8 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] italic flex items-center justify-center gap-3">
                <UserCheck size={16}/> Professional Edition • v9.4
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
