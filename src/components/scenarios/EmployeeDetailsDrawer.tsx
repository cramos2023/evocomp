import React, { useState, useMemo } from 'react';
import { X, Search, FileJson, AlertTriangle, AlertCircle } from 'lucide-react';

export interface EmployeeDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any | null; // Selected EmployeeResult
  getAnyAttr: (row: any, key: string) => any; // Shared attribute getter
  guidelineMaxPct?: number | null; // Calculated max pct for the employee
  scenarioRules: any; // Used to derive Compa Band label and enforcement mode
}

export function EmployeeDetailsDrawer({ 
  isOpen, 
  onClose, 
  employee, 
  getAnyAttr,
  guidelineMaxPct,
  scenarioRules
}: EmployeeDetailsDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  if (!isOpen || !employee) return null;

  // Derive compa band logic
  const compaBeforeNum = Number(getAnyAttr(employee, 'compa_ratio') ?? 0);
  let zoneLabel = '—';
  if (compaBeforeNum > 0) {
    if (scenarioRules.compa_bands && Array.isArray(scenarioRules.compa_bands)) {
      const band = scenarioRules.compa_bands.find((b: any) => compaBeforeNum >= (b.min ?? -Infinity) && compaBeforeNum < (b.max ?? Infinity));
      if (band) zoneLabel = band.label || band.key;
    } else {
      const t1 = scenarioRules.threshold_1 ?? 0.8;
      const t2 = scenarioRules.threshold_2 ?? 1.0;
      const t3 = scenarioRules.threshold_3 ?? 1.2;
      if (compaBeforeNum < t1) zoneLabel = 'Below Min';
      else if (compaBeforeNum < t2) zoneLabel = 'Below Mid';
      else if (compaBeforeNum < t3) zoneLabel = 'Above Mid';
      else zoneLabel = 'Above Max';
    }
  }

  // Derive compa after logic
  const baseAfter = Number(getAnyAttr(employee, 'calc_new_base_salary_local'));
  const marketRef = Number(getAnyAttr(employee, 'market_reference_value_local') ?? getAnyAttr(employee, 'market_reference_amount_local'));
  const compaAfter = (baseAfter > 0 && marketRef > 0) ? (baseAfter / marketRef) : null;

  // Extract dynamic inputs/outputs
  const afterJson = employee.after_json || {};
  const beforeJson = employee.before_json || {};
  
  const inputKeys = Object.keys(afterJson).filter(k => k.startsWith('input_'));
  const calcKeys = Object.keys(afterJson).filter(k => k.startsWith('calc_'));

  // Define structured sections mapped to 'tabla ideal' groups
  interface DrawerItem {
    label: string;
    key: string;
    val: any;
    isCurrency?: boolean;
    highlight?: boolean;
    isNumber?: boolean;
  }

  interface DrawerSection {
    id: string;
    title: string;
    items: DrawerItem[];
  }

  const sections: DrawerSection[] = [
    {
      id: 'identity',
      title: 'Identity & Organization',
      items: [
        { label: 'Employee ID', key: 'employee_external_id', val: getAnyAttr(employee, 'employee_external_id') || employee.employee_id },
        { label: 'Full Name', key: 'full_name', val: getAnyAttr(employee, 'full_name') },
        { label: 'Status', key: 'employee_status', val: getAnyAttr(employee, 'employee_status') || 'ACTIVE' },
        { label: 'Country / Location', key: 'country_code', val: getAnyAttr(employee, 'country_code') },
        { label: 'Organization Unit', key: 'org_unit_name', val: getAnyAttr(employee, 'org_unit_name') },
        { label: 'Manager Name', key: 'manager_name', val: getAnyAttr(employee, 'manager_name') },
      ]
    },
    {
      id: 'hr_base',
      title: 'HR Base Data',
      items: [
        { label: 'Job Title', key: 'job_title', val: getAnyAttr(employee, 'job_title') },
        { label: 'Pay Grade', key: 'pay_grade_internal', val: getAnyAttr(employee, 'pay_grade_internal') },
        { label: 'Career Level', key: 'career_level', val: getAnyAttr(employee, 'career_level') },
        { label: 'Job Family', key: 'job_family', val: getAnyAttr(employee, 'job_family') },
        { label: 'Employment Type', key: 'employment_type', val: getAnyAttr(employee, 'employment_type') },
      ]
    },
    {
      id: 'comp_base',
      title: 'Compensation Base (Before)',
      items: [
        { label: 'Base Salary (Local)', key: 'base_salary_local', val: getAnyAttr(employee, 'base_salary_local'), isCurrency: true },
        { label: 'Target Cash (Local)', key: 'target_cash_local', val: getAnyAttr(employee, 'target_cash_local'), isCurrency: true },
        { label: 'Total Guaranteed (Local)', key: 'total_guaranteed_local', val: getAnyAttr(employee, 'total_guaranteed_local'), isCurrency: true },
        { label: 'Market Reference', key: 'market_reference_value_local', val: marketRef || getAnyAttr(employee, 'market_reference_code'), isCurrency: !!marketRef },
      ]
    },
    {
      id: 'competitiveness',
      title: 'Competitiveness',
      items: [
        { label: 'Compa Ratio (Before)', key: 'compa_before', val: compaBeforeNum ? `${(compaBeforeNum * 100).toFixed(1)}%` : null },
        { label: 'Compa Band (Zone)', key: 'compa_band', val: zoneLabel !== '—' ? zoneLabel : null },
        { label: 'Compa Ratio (After)', key: 'compa_after', val: compaAfter ? `${(compaAfter * 100).toFixed(1)}%` : null, highlight: true },
      ]
    },
    {
      id: 'guidelines',
      title: 'Guidelines (Matrix Rule)',
      items: [
        { label: 'Performance Rating', key: 'performance_rating', val: getAnyAttr(employee, 'performance_rating') },
        { label: 'Guideline Max %', key: 'guideline_max_pct', val: guidelineMaxPct !== null && guidelineMaxPct !== undefined ? `${(guidelineMaxPct * 100).toFixed(2)}%` : null },
        { label: 'Enforcement Mode', key: 'enforcement_mode', val: scenarioRules.guidelines?.enforcement_mode || 'warn' },
      ]
    },
    {
      id: 'inputs',
      title: 'Inputs',
      items: inputKeys.map(k => ({
        label: k.replace('input_', '').replace(/_/g, ' '),
        key: k,
        val: afterJson[k],
        isNumber: true
      }))
    },
    {
      id: 'outputs',
      title: 'Outputs (Calculated)',
      items: calcKeys.map(k => ({
        label: k.replace('calc_', '').replace(/_/g, ' '),
        key: k,
        val: afterJson[k],
        isNumber: true
      }))
    }
  ];

  // Search filter
  const term = searchTerm.toLowerCase().trim();
  const filteredSections = term === '' ? sections : sections.map(sec => ({
    ...sec,
    items: sec.items.filter(item => 
      item.label.toLowerCase().includes(term) || 
      item.key.toLowerCase().includes(term) ||
      String(item.val || '').toLowerCase().includes(term)
    )
  })).filter(sec => sec.items.length > 0);

  // Render helper for values
  const renderVal = (item: any) => {
    if (item.val === null || item.val === undefined || item.val === '') return <span className="text-slate-300 italic">N/A</span>;
    if (item.isCurrency) {
      const num = Number(item.val);
      if (!isNaN(num)) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (item.isNumber && typeof item.val === 'number') {
      // Basic formatting for numbers
      if (item.key.includes('pct')) return `${(item.val * 100).toFixed(2)}%`;
      return item.val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(item.val);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
              {String(getAnyAttr(employee, 'full_name') || 'N/A').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate" title={getAnyAttr(employee, 'full_name')}>
                {getAnyAttr(employee, 'full_name') || 'Unknown Employee'}
              </h2>
              <p className="text-xs text-slate-500 font-mono tracking-tight">
                ID: {getAnyAttr(employee, 'employee_external_id') || employee.employee_id}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search fields or values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Flags Banner */}
          {employee.flags_json && employee.flags_json.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 flex-wrap items-center">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-800">Flags:</span>
              {employee.flags_json.map((flag: string) => (
                <span key={flag} className="px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tighter bg-white text-amber-700 border-amber-200 shadow-sm">
                  {flag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Sections */}
          {filteredSections.map(section => (
            <div key={section.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.title}</h3>
                <span className="text-[10px] text-slate-400 font-mono">{section.items.length} fields</span>
              </div>
              <div className="divide-y divide-slate-50">
                {section.items.map(item => (
                  <div key={item.key} className="px-4 py-3 flex items-start sm:items-center justify-between gap-4">
                    <div className="min-w-[120px] shrink-0">
                      <p className="text-sm font-medium text-slate-700 capitalize">{item.label}</p>
                      <p className="text-[9px] text-slate-400 font-mono" title={item.key}>{item.key}</p>
                    </div>
                    <div className={`text-sm text-right break-all ${item.highlight ? 'font-bold text-purple-600' : 'text-slate-900'} ${item.isCurrency || item.isNumber ? 'font-mono' : ''}`}>
                      {renderVal(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              No fields found matching "{searchTerm}"
            </div>
          )}

          {/* Raw JSON Debug (Collapsible) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
            <button 
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-600">Raw JSON Data (Debug)</span>
              </div>
              <span className="text-xs text-slate-400">{showRawJson ? 'Hide' : 'Show'}</span>
            </button>
            
            {showRawJson && (
              <div className="p-4 border-t border-slate-200 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">before_json:</p>
                  <pre className="text-[10px] bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify(beforeJson, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">after_json:</p>
                  <pre className="text-[10px] bg-slate-900 text-blue-400 p-3 rounded-lg overflow-x-auto font-mono">
                    {JSON.stringify(afterJson, null, 2)}
                  </pre>
                </div>
                {employee.snapshot_employee_data && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2">snapshot_employee_data:</p>
                    <pre className="text-[10px] bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto font-mono">
                      {JSON.stringify(employee.snapshot_employee_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </>
  );
}
