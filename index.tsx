
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
const STORAGE_KEY = 'thcs_teaching_mgmt_v9_5_pro';

const FLEX_MAPPING: Record<string, string> = {
    'KHTN1': 'KHTN', 'KHTN2': 'KHTN', 'KHTN3': 'KHTN',
    'HĐTN1': 'HĐTN', 'HĐTN2': 'HĐTN', 'HĐTN3': 'HĐTN',
    'GDĐP': 'GDĐP'
};

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
    // Môn nhóm linh hoạt (Chỉ cấu hình tiết định mức cho môn mẹ để tính tiến độ)
    { name: 'KHTN', p6: 4, p7: 4, p8: 4, p9: 4, isGroup: true },
    { name: 'HĐTN', p6: 3, p7: 3, p8: 3, p9: 3, isGroup: true },
    { name: 'GDĐP', yearly: { p6: 35, p7: 35, p8: 35, p9: 35 }, isGroup: true }
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

// --- TAB PHÂN CÔNG ---
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

    const isFlexSub = !!FLEX_MAPPING[selectedSubject];

    // Bẫy lỗi trùng môn/lớp trong toàn tuần (Bản nháp)
    const getFullAssignmentMap = useCallback(() => {
        const map: Record<string, string> = {};
        Object.entries(assignments).forEach(([tId, str]: any) => {
            const t = data.masterTeachers.find((x: any) => x.id === tId);
            const name = t ? t.name : "GV khác";
            (str || "").split(';').forEach((p: string) => {
                const cleanPart = p.includes('[') ? p.split('[')[0] : p.split(':')[0];
                const subName = cleanPart.trim();
                const clsPart = p.includes(':') ? p.split(':')[1] : "";
                clsPart.split(',').map(c => c.trim().toUpperCase()).filter(c => c).forEach(cls => {
                    map[`${subName}:${cls}`] = name;
                });
            });
        });
        return map;
    }, [assignments, data.masterTeachers]);

    const handleCommitChanges = () => {
        updateWeekData(currentWeek, draftWeek);
        setIsDirty(false);
        alert(`Đã lưu dữ liệu Tuần ${currentWeek}!`);
    };

    const copyFromPrevious = () => {
        if (!prevWeekData || prevWeekData.teachers.length === 0) return alert("Tuần trước không có dữ liệu!");
        setDraftWeek({ ...prevWeekData });
        setIsDirty(true);
        setIsCopying(false);
        alert("Đã lấy dữ liệu tuần cũ vào bản nháp. Nhấn LƯU để xác nhận.");
    };

    const exportAllWeeks = () => {
        const wb = XLSX.utils.book_new();
        const weeks = Object.keys(data.weeklyRecords).map(Number).sort((a,b) => a-b);
        if (weeks.length === 0) return alert("Chưa có dữ liệu!");

        weeks.forEach(w => {
            const rec = data.weeklyRecords[w];
            const sheetData = rec.teachers.map((t: any) => ({
                "ID": t.id,
                "Họ tên": t.name,
                "Chức vụ": (t.roles || []).join(', '),
                "Phân công": rec.assignments[t.id] || "",
                "Tiết TKB": getTKBPeriods(rec.assignments[t.id] || ""),
                "Dạy bù": rec.logs?.[t.id]?.bu || 0,
                "Tăng tiết": rec.logs?.[t.id]?.tang || 0,
                "Thực dạy": (getTKBPeriods(rec.assignments[t.id] || "") + (rec.logs?.[t.id]?.bu || 0) + (rec.logs?.[t.id]?.tang || 0)).toFixed(1)
            }));
            const ws = XLSX.utils.json_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, `Tuần ${w}`);
        });
        XLSX.writeFile(wb, `Phan_Cong_Giang_Day_THCS_Full.xlsx`);
    };

    return (
        <div className="p-8 animate-fadeIn pb-32">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-10">
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
                    <button onClick={() => setCurrentWeek(Math.max(1, currentWeek-1))} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><ChevronLeft size={20}/></button>
                    <div className="px-8 text-center border-x border-slate-100">
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Tuần đang chọn</div>
                        <div className="text-3xl font-black text-slate-800 tracking-tighter">{currentWeek}</div>
                    </div>
                    <button onClick={() => setCurrentWeek(currentWeek+1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><ChevronRight size={20}/></button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={exportAllWeeks} className="px-5 py-3 rounded-xl flex items-center gap-2 font-black text-[11px] uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all"><FileSpreadsheet size={18}/> Xuất Excel All Weeks</button>
                    <button onClick={() => setIsCopying(true)} className="px-5 py-3 rounded-xl flex items-center gap-2 font-black text-[11px] uppercase bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 transition-all"><Copy size={18}/> Lấy tuần cũ</button>
                    <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-8 py-3 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-blue-700 text-[11px] uppercase tracking-widest transition-all">{isAdding ? 'Đóng' : 'Thêm Phân công'}</button>
                </div>
            </div>

            {isAdding && (
                <div className="mb-10 bg-white border-4 border-blue-50 p-8 rounded-[2rem] animate-fadeIn shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-6 italic">Ghi nháp Phân công mới (Tuần {currentWeek})</h3>
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
                                <optgroup label="Môn cố định">
                                    {data.subjectConfigs.filter((s:any)=>!s.isGroup).map((s: any) => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </optgroup>
                                <optgroup label="Môn linh hoạt">
                                    {Object.keys(FLEX_MAPPING).map(f => <option key={f} value={f}>{f}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp (VD: 6A, 6B)</label>
                            <input type="text" placeholder="6A, 6B..." className="w-full p-4 rounded-xl bg-slate-50 border-none outline-none font-medium shadow-inner" value={selectedClasses} onChange={(e) => setSelectedClasses(e.target.value)}/>
                        </div>
                        {isFlexSub && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Tổng số tiết thực dạy</label>
                                <input type="number" step="0.5" placeholder="Nhập tiết..." className="w-full p-4 rounded-xl bg-orange-50 border-2 border-orange-100 outline-none font-black shadow-inner" value={flexPeriods} onChange={(e) => setFlexPeriods(e.target.value)}/>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-8 gap-3">
                        <button onClick={() => {
                            if (!selectedTeacherId || !selectedSubject || !selectedClasses) return alert("Thiếu thông tin!");
                            const clsList = selectedClasses.split(',').map(c => c.trim().toUpperCase()).filter(c => c);
                            const map = getFullAssignmentMap();

                            for (let c of clsList) {
                                if (!isValidClassName(c)) return alert(`Lớp ${c} sai định dạng!`);
                                if (map[`${selectedSubject}:${c}`]) return alert(`Môn ${selectedSubject} tại lớp ${c} đã được giao cho ${map[`${selectedSubject}:${c}`]}!`);
                            }

                            let newPart = isFlexSub ? `${selectedSubject}[${flexPeriods || 0}]: ${clsList.join(', ')}` : `${selectedSubject}: ${clsList.join(', ')}`;
                            const updatedAssigned = assignments[selectedTeacherId] ? `${assignments[selectedTeacherId]}; ${newPart}` : newPart;
                            const isNew = !teachers.some((t:any)=>t.id === selectedTeacherId);
                            const mt = data.masterTeachers.find((x:any)=>x.id===selectedTeacherId);

                            setDraftWeek({
                                ...draftWeek,
                                teachers: isNew ? [...teachers, mt] : teachers,
                                assignments: { ...assignments, [selectedTeacherId]: updatedAssigned }
                            });
                            setIsDirty(true);
                            setSelectedClasses(""); setFlexPeriods("");
                        }} className="bg-blue-600 text-white px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">Thêm vào bản nháp</button>
                    </div>
                </div>
            )}

            {isCopying && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-fadeIn">
                        <h3 className="text-xl font-black text-slate-800 mb-4 italic">Lấy lại phân công tuần cũ?</h3>
                        <p className="text-slate-500 text-sm mb-8">Hệ thống sẽ ghi đè toàn bộ bản nháp hiện tại bằng dữ liệu của tuần {currentWeek-1}.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsCopying(false)} className="flex-1 p-4 bg-slate-100 rounded-xl font-black text-[11px] uppercase text-slate-400">Hủy</button>
                            <button onClick={copyFromPrevious} className="flex-1 p-4 bg-blue-600 rounded-xl font-black text-[11px] uppercase text-white shadow-lg">Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        <tr>
                            <th className="p-5">Giáo viên</th>
                            <th className="p-5 w-1/3">Phân công chi tiết (Môn: Lớp)</th>
                            <th className="p-5 text-center">Tiết TKB</th>
                            <th className="p-5 text-center text-orange-600">Dạy bù</th>
                            <th className="p-5 text-center text-orange-600">Tăng tiết</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {teachers.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50/40 transition-all group">
                                <td className="p-5">
                                    <div className="font-black text-slate-800 text-base">{t.name}</div>
                                    <div className="text-[9px] text-slate-300 font-bold uppercase">{t.id}</div>
                                </td>
                                <td className="p-5">
                                    <input type="text" className="w-full p-3 rounded-xl border-none font-medium text-sm shadow-inner bg-slate-50 text-slate-700" value={assignments[t.id] || ""} onChange={(e) => { setDraftWeek({ ...draftWeek, assignments: { ...assignments, [t.id]: e.target.value } }); setIsDirty(true); }} placeholder="Môn: Lớp1, Lớp2..."/>
                                </td>
                                <td className="p-5 text-center font-black text-slate-800 text-2xl tracking-tighter">{getTKBPeriods(assignments[t.id] || "").toFixed(1)}</td>
                                <td className="p-5"><LocalNumericInput value={logs[t.id]?.bu || 0} onChange={(v: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...(logs[t.id]||{bu:0,tang:0}), bu: v } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 text-sm shadow-inner outline-none"/></td>
                                <td className="p-5"><LocalNumericInput value={logs[t.id]?.tang || 0} onChange={(v: number) => { setDraftWeek({ ...draftWeek, logs: { ...logs, [t.id]: { ...(logs[t.id]||{bu:0,tang:0}), tang: v } } }); setIsDirty(true); }} className="w-16 mx-auto block text-center p-3 bg-orange-50 border-2 border-orange-100 rounded-xl font-black text-orange-700 text-sm shadow-inner outline-none"/></td>
                                <td className="p-5 text-right opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { if(confirm(`Xóa ${t.name}?`)) { setDraftWeek({ ...draftWeek, teachers: teachers.filter((x:any)=>x.id!==t.id)}); setIsDirty(true); } }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={20}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {teachers.length === 0 && <div className="p-20 text-center text-slate-300 font-bold uppercase italic text-xs tracking-[0.3em]">Chưa có dữ liệu phân công tuần này</div>}
            </div>

            {isDirty && (
                <div className="fixed bottom-10 right-10 z-[60] animate-bounce">
                    <button onClick={handleCommitChanges} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 border-4 border-white transition-all scale-110">
                        <Save size={28}/> LƯU BẢN NHÁP TUẦN {currentWeek}
                    </button>
                </div>
            )}
        </div>
    );
};

// --- TAB BÁO CÁO ---
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

    const subjectProgress = useMemo(() => {
        const results: any[] = [];
        const numWeeks = (repRange.e - repRange.s + 1);
        
        // Chỉ thống kê theo môn chính thức (Toán, Văn..., KHTN, HĐTN, GDĐP)
        const mainSubjects = data.subjectConfigs.filter((s:any) => s.name && !s.parent);

        mainSubjects.forEach((sub: any) => {
            let totalActual = 0;
            // Tính thực dạy cho môn chính (bao gồm các phân môn)
            for (let w = repRange.s; w <= repRange.e; w++) {
                const rec = data.weeklyRecords[w]; if (!rec) continue;
                Object.entries(rec.assignments).forEach(([tid, str]: any) => {
                    (str || "").split(';').forEach((p: string) => {
                        const cleanSub = p.includes('[') ? p.split('[')[0].trim() : p.split(':')[0].trim();
                        const flexGroup = FLEX_MAPPING[cleanSub] || cleanSub;
                        if (flexGroup === sub.name) {
                            if (p.includes('[')) {
                                totalActual += parseFloat(p.match(/\[([\d.]+)\]/)?.[1] || "0");
                            } else {
                                const clsPart = p.split(':')[1] || "";
                                clsPart.split(',').forEach(c => {
                                    const g = c.trim().match(/^[6-9]/)?.[0];
                                    if (g) totalActual += Number(sub[`p${g}`] || 0);
                                });
                            }
                            const log = rec.logs?.[tid] || { bu: 0, tang: 0 };
                            // Phân bổ dạy bù/tăng tiết (Tạm tính 100% vào môn đang xét)
                            totalActual += (log.bu || 0) + (log.tang || 0);
                        }
                    });
                });
            }

            let yearlyTarget = 0;
            if (sub.name === 'GDĐP') {
                ['6','7','8','9'].forEach(g => yearlyTarget += (sub.yearly[`p${g}`] || 0) * (data.gradeClassCounts[`p${g}`] || 0));
            } else {
                ['6','7','8','9'].forEach(g => yearlyTarget += (sub[`p${g}`] || 0) * (data.gradeClassCounts[`p${g}`] || 0) * 35);
            }

            results.push({
                name: sub.name,
                actual: totalActual,
                target: yearlyTarget,
                percent: yearlyTarget > 0 ? (totalActual / yearlyTarget) * 100 : 0
            });
        });
        return results.sort((a,b) => b.percent - a.percent);
    }, [data, repRange]);

    const exportProgressReport = () => {
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(teacherStats.map(s => ({ "Họ tên": s.name, "Định mức TL": s.progQuota, "Thực dạy TL": s.total, "Thừa/Thiếu": s.bal })));
        XLSX.utils.book_append_sheet(wb, ws1, "Tien_Do_Giao_Vien");
        const ws2 = XLSX.utils.json_to_sheet(subjectProgress.map(s => ({ "Môn học": s.name, "Thực dạy": s.actual, "Kế hoạch năm": s.target, "Phần trăm": s.percent.toFixed(2) + "%" })));
        XLSX.utils.book_append_sheet(wb, ws2, "Tien_Do_Mon_Hoc");
        XLSX.writeFile(wb, `Bao_Cao_Tien_Do_Tong_Hop.xlsx`);
    };

    return (
        <div className="p-8 animate-fadeIn space-y-12">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Từ tuần:</span>
                        <input type="number" value={repRange.s} onChange={e => setRepRange({...repRange, s: parseInt(e.target.value)||1})} className="w-16 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none outline-none"/>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Đến tuần:</span>
                        <input type="number" value={repRange.e} onChange={e => setRepRange({...repRange, e: parseInt(e.target.value)||1})} className="w-16 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600 border-none outline-none"/>
                    </div>
                </div>
                <button onClick={exportProgressReport} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-all"><FileDown size={20}/> Xuất Báo cáo Tiến độ</button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2"><Users className="text-blue-600"/> Theo dõi Định mức Giáo viên</h3>
                    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                                <tr>
                                    <th className="p-5">Họ tên Giáo viên</th>
                                    <th className="p-5 text-center">Định mức TL</th>
                                    <th className="p-5 text-center">Tích lũy</th>
                                    <th className="p-5 text-center text-blue-600">Thừa/Thiếu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {teacherStats.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-black text-slate-700">{s.name}</td>
                                        <td className="p-4 text-center text-slate-400 font-bold">{s.progQuota.toFixed(1)}</td>
                                        <td className="p-4 text-center text-slate-800 font-black">{s.total.toFixed(1)}</td>
                                        <td className={`p-4 text-center font-black text-lg ${s.bal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.bal > 0 ? `+${s.bal.toFixed(1)}` : s.bal.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2"><TrendingUp className="text-blue-600"/> Tiến độ Môn học Toàn năm</h3>
                    <div className="bg-white rounded-[1.5rem] p-8 border border-slate-100 shadow-xl space-y-6 max-h-[600px] overflow-y-auto no-scrollbar">
                        {subjectProgress.map((s: any, i: number) => (
                            <div key={i} className="space-y-2 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="font-black text-slate-700 text-sm italic">{s.name}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Thực dạy: {s.actual.toFixed(1)} / {s.target.toFixed(1)} tiết</div>
                                    </div>
                                    <div className={`font-black text-lg ${s.percent >= 100 ? 'text-emerald-500' : 'text-blue-600'}`}>{s.percent.toFixed(1)}%</div>
                                </div>
                                <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                    <div className={`h-full transition-all duration-1000 ${s.percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, s.percent)}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TAB CÀI ĐẶT ---
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

    const exportBackupJSON = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `teaching_mgmt_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    };

    const importExcelBackup = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const gvRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            const newTs = gvRows.map((r: any, i) => ({
                id: r["Mã GV"] || r["ID"] || `GV_NEW_${i}`,
                name: r["Họ tên"] || r["Họ và tên"],
                roles: (r["Chức vụ"] || "").split(",").map((s:any)=>s.trim()).filter((s:any)=>s)
            }));
            setLocalDraft(prev => ({ ...prev, masterTeachers: [...prev.masterTeachers, ...newTs] }));
            setIsDirty(true);
            alert("Đã lấy dữ liệu từ Excel vào bản nháp.");
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-8 animate-fadeIn space-y-12 pb-40">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter flex items-center gap-2"><Settings className="text-blue-600" /> CÀI ĐẶT HỆ THỐNG</h2>
                <div className="flex gap-2">
                    <button onClick={exportBackupJSON} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" title="Sao lưu JSON"><Database size={20}/></button>
                    <button onClick={() => sysFileRef.current?.click()} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Khôi phục Excel"><Upload size={20}/></button>
                    <input type="file" ref={sysFileRef} className="hidden" accept=".xlsx,.xls" onChange={importExcelBackup}/>
                    {isDirty && (
                        <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2"><Save size={18}/> Lưu cấu hình</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic flex items-center gap-2"><Users className="text-blue-600" /> Quản lý Nhân sự</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-50 shadow-xl space-y-6">
                        <div className="flex flex-col gap-4">
                            <input type="text" placeholder="Họ tên Giáo viên..." value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl font-bold shadow-inner outline-none" onKeyDown={e=>{if(e.key==='Enter') {if(!newName)return;setLocalDraft({...localDraft,masterTeachers:[...localDraft.masterTeachers,{id:generateTeacherId(),name:newName,roles:[...newTeacherRoles]}]});setIsDirty(true);setNewName('');setNewTeacherRoles([]);}}}/>
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
                                    <button onClick={() => { if(confirm(`Xóa GV ${mt.name}?`)) {setLocalDraft({ ...localDraft, masterTeachers: localDraft.masterTeachers.filter((x:any)=>x.id !== mt.id) }); setIsDirty(true);} }} className="text-slate-200 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-lg font-black text-slate-700 uppercase italic flex items-center gap-2"><BookOpen className="text-blue-600" /> Cấu hình Môn & Số lớp</h3>
                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-50 shadow-xl space-y-8">
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block tracking-widest">Định mức chuẩn 1 GV (Tiết/Tuần)</label>
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
                                <div key={i} className={`p-4 rounded-2xl border ${s.isGroup ? 'bg-blue-50/20 border-blue-50' : 'bg-white border-slate-50 shadow-sm'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-black text-slate-700 text-xs italic uppercase tracking-tighter">{s.name} {s.yearly ? '(Cấu hình Năm)' : ''}</div>
                                        {s.isGroup && <span className="bg-blue-100 text-blue-600 text-[8px] px-2 py-0.5 rounded uppercase font-black">Nhóm Môn</span>}
                                    </div>
                                    {s.yearly ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            {['6', '7', '8', '9'].map(g => (
                                                <div key={g} className="text-center">
                                                    <div className="text-[8px] text-slate-300 font-bold">K{g}</div>
                                                    <input type="number" value={s.yearly[`p${g}`]} onChange={e => { const nc = [...localDraft.subjectConfigs]; nc[i].yearly[`p${g}`] = parseInt(e.target.value) || 0; setLocalDraft({...localDraft, subjectConfigs: nc}); setIsDirty(true); }} className="w-full p-2 bg-slate-50/50 rounded-lg text-center font-black text-orange-600 text-[10px] outline-none shadow-inner"/>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2">
                                            {['6', '7', '8', '9'].map(g => (
                                                <div key={g} className="text-center">
                                                    <div className="text-[8px] text-slate-300 font-bold">K{g}</div>
                                                    <input type="number" step="0.5" value={s[`p${g}`]} onChange={e => { const nc = [...localDraft.subjectConfigs]; nc[i][`p${g}`] = parseFloat(e.target.value) || 0; setLocalDraft({...localDraft, subjectConfigs: nc}); setIsDirty(true); }} className="w-full p-2 bg-slate-50/50 rounded-lg text-center font-black text-blue-500 text-[10px] outline-none shadow-inner"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {isDirty && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fadeIn">
                    <button onClick={handleSaveConfig} className="bg-emerald-600 text-white px-12 py-5 rounded-2xl flex items-center gap-3 font-black shadow-2xl hover:bg-emerald-700 border-4 border-white transition-all scale-110">
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
                const flexMatch = part.match(/\[([\d.]+)\]/);
                if (flexMatch) {
                    total += parseFloat(flexMatch[1]) || 0;
                } else {
                    const [subNameRaw, clsPart] = part.split(':');
                    if (subNameRaw && clsPart) {
                        const subName = subNameRaw.trim().toLowerCase();
                        // Kiểm tra nếu là môn mẹ hoặc môn con thuộc môn mẹ
                        const flexGroup = FLEX_MAPPING[subNameRaw.trim()] || subNameRaw.trim();
                        const subConfig = configMap.get(flexGroup.toLowerCase());
                        if (subConfig && !subConfig.yearly) {
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
                            <h1 className="font-black text-xl tracking-tighter text-slate-800 uppercase italic leading-none">GIẢNG DẠY THCS <span className="text-blue-600 text-[10px] align-top font-black italic">PRO v9.5</span></h1>
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
                    {activeTab === 'reports' && <ReportTab data={data} startRange={1} endRange={currentWeek} getTKBPeriods={getTKBPeriods} getTeacherReduction={getTeacherReduction} />}
                </div>
            </main>
            <footer className="p-8 text-center text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] italic flex items-center justify-center gap-3">
                <UserCheck size={16}/> Professional Edition • v9.5
            </footer>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
