import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { jdService } from '../services/jdService';
import { useJDCatalogs } from '../hooks/useJDCatalogs';
import type { JDProfile, JDVersion, JDResponsibility, Position } from '../types/jd';
import { AdvisoryCard } from '../components/AdvisoryCard';
import { CompDiagnosticsPanel } from '../components/CompDiagnosticsPanel';
import { Building2, Users, Globe, GitBranch, UserPlus } from 'lucide-react';

const STEPS = ['key_details', 'scope_purpose', 'responsibilities', 'requirements', 'review'] as const;
const MANAGERIAL_OPTS = ['NO_DIRECT', 'MANAGES_IC', 'MANAGES_MANAGERS', 'EXECUTIVE'];
const BUDGET_OPTS = ['NONE', 'DEPT', 'BU', 'ENTERPRISE'];
const GEO_OPTS = ['LOCAL', 'COUNTRY', 'REGIONAL', 'GLOBAL'];
const TEAM_OPTS = ['0', '1_5', '6_15', '16_50', '50_PLUS'];
const EXPERTISE = ['ENTRY', 'JUNIOR', 'SENIOR', 'SPECIALIST', 'EXPERT'];
const CRITICALITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface ResponsibilityForm {
  title: string;
  description: string;
  skills: string;
  expertise_level: string;
  percentage_of_time: number;
  category: string;
  is_essential: boolean;
  criticality: string;
  display_order: number;
}

const emptyResp = (): ResponsibilityForm => ({
  title: '', description: '', skills: '', expertise_level: 'SENIOR',
  percentage_of_time: 0, category: '', is_essential: false, criticality: 'MEDIUM', display_order: 0,
});

export default function JDBuilderPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const bp = 'pages.job_description.builder';

  const { functions, jobFamilies, careerLevels, selectedFunction, setSelectedFunction } = useJDCatalogs();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state — flat fields matching DB columns
  const [form, setForm] = useState({
    reference_job_code: '',
    title: '',
    career_function: '',
    job_family: '',
    career_level: '',
    business_type: 'CORE_JOBS',
    job_purpose: '',
    typical_aliases: '',
    team_size: '',
    geographic_responsibility: '',
    budget_responsibility: '',
    supervised_career_levels: '',
    stakeholders: '',
    education: '',
    experience_years: '',
    certifications: '',
    languages: '',
    technical_skills: '',
    behavioral_competencies: '',
    additional_info: '',
    provider_code_1: '',
    provider_code_2: '',
    provider_code_3: '',
    // Org Context for Advisor
    managerial_scope: '',
    team_size_range: '',
    geographic_scope: '',
    // Position Architecture
    position_id: '',
    is_new_position: false,
    new_position_title: '',
  });

  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [levelMappings, setLevelMappings] = useState<any[]>([]);

  const [responsibilities, setResponsibilities] = useState<ResponsibilityForm[]>([]);
  const [existingProfile, setExistingProfile] = useState<JDProfile | null>(null);

  // Load catalogs and positions
  useEffect(() => {
    setLoadingPositions(true);
    jdService.getPositions()
      .then(setPositions)
      .finally(() => setLoadingPositions(false));
      
    jdService.getClassificationLevelMappings()
      .then(setLevelMappings)
      .catch(console.error);
  }, []);

  // Load existing profile in edit mode
  useEffect(() => {
    if (isEdit && id) {
      jdService.getProfileById(id).then(profile => {
        if (!profile) return;
        setExistingProfile(profile);
        const v = profile.versions?.[profile.versions.length - 1];
        if (v) {
          setForm({
            reference_job_code: profile.reference_job_code,
            title: v.title,
            career_function: v.career_function,
            job_family: v.job_family,
            career_level: v.career_level,
            business_type: v.business_type || 'CORE_JOBS',
            job_purpose: v.job_purpose || '',
            typical_aliases: v.typical_aliases || '',
            team_size: v.team_size || '',
            geographic_responsibility: v.geographic_responsibility || '',
            budget_responsibility: profile.budget_responsibility || '',
            supervised_career_levels: v.supervised_career_levels || '',
            stakeholders: v.stakeholders || '',
            education: v.education || '',
            experience_years: v.experience_years || '',
            certifications: v.certifications || '',
            languages: v.languages || '',
            technical_skills: v.technical_skills || '',
            behavioral_competencies: v.behavioral_competencies || '',
            additional_info: '',
            provider_code_1: v.provider_code_1 || '',
            provider_code_2: v.provider_code_2 || '',
            provider_code_3: v.provider_code_3 || '',
            managerial_scope: profile.managerial_scope || '',
            team_size_range: profile.team_size_range || '',
            geographic_scope: profile.geographic_scope || '',
            position_id: '',
            is_new_position: false,
            new_position_title: '',
          });
          setSelectedFunction(v.career_function);
          if (v.responsibilities) {
            setResponsibilities(v.responsibilities.map(r => ({
              title: r.title,
              description: r.description || '',
              skills: '',
              expertise_level: r.proficiency_level || 'SENIOR',
              percentage_of_time: r.percentage_of_time,
              category: r.category || '',
              is_essential: r.is_essential,
              criticality: 'MEDIUM',
              display_order: r.display_order,
            })));
          }
        }
      }).catch(console.error);
    }
  }, [id, isEdit, setSelectedFunction]);

  // Sync career function with catalog hook
  useEffect(() => {
    if (form.career_function && form.career_function !== selectedFunction) {
      setSelectedFunction(form.career_function);
    }
  }, [form.career_function, selectedFunction, setSelectedFunction]);

  const totalPct = useMemo(() =>
    responsibilities.reduce((s, r) => s + (Number(r.percentage_of_time) || 0), 0),
    [responsibilities]
  );

  const addResponsibility = () => {
    setResponsibilities(prev => [...prev, emptyResp()]);
  };

  const removeResponsibility = (idx: number) => {
    setResponsibilities(prev => prev.filter((_, i) => i !== idx));
  };

  const updateResp = (idx: number, key: keyof ResponsibilityForm, val: any) => {
    setResponsibilities(prev => {
      const arr = [...prev];
      arr[idx] = { ...arr[idx], [key]: val };
      return arr;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = t(`${bp}.validation.title_required`);
    if (!form.career_function) e.function = t(`${bp}.validation.function_required`);
    if (!form.career_level) e.level = t(`${bp}.validation.level_required`);
    if (responsibilities.length > 0 && totalPct !== 100) {
      e.responsibilities = t(`${bp}.validation.responsibilities_100`);
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrors(prev => { const e = { ...prev }; delete e.save; return e; });
    try {
      const profileData: Partial<JDProfile> = {
        id: existingProfile?.id,
        tenant_id: existingProfile?.tenant_id,
        reference_job_code: form.reference_job_code || `JP-${Date.now().toString(36).toUpperCase()}`,
        managerial_scope: form.managerial_scope,
        team_size_range: form.team_size_range,
        geographic_scope: form.geographic_scope,
        budget_responsibility: form.budget_responsibility,
      };

      // Handle Placeholder Position creation if needed
      let targetPositionId = form.position_id;
      if (form.is_new_position && form.new_position_title) {
        const placeholder = await jdService.createPlaceholderPosition({
          title: form.new_position_title,
          companyCode: 'ME', // Defaulting for Phase 1.1
          functionCode: form.career_function.split(' ')[0], // Rough extraction
        });
        targetPositionId = placeholder.position_id;
      }

      const versionData: Partial<JDVersion> = {
        id: existingProfile?.versions?.[existingProfile.versions.length - 1]?.id,
        title: form.title,
        career_function: form.career_function,
        job_family: form.job_family,
        career_level: form.career_level,
        business_type: form.business_type,
        job_purpose: form.job_purpose,
        typical_aliases: form.typical_aliases,
        team_size: form.team_size_range, // Mapping to form field
        geographic_responsibility: form.geographic_scope, // Mapping to form field
        supervised_career_levels: form.supervised_career_levels,
        stakeholders: form.stakeholders,
        education: form.education,
        experience_years: form.experience_years,
        certifications: form.certifications,
        languages: form.languages,
        technical_skills: form.technical_skills,
        behavioral_competencies: form.behavioral_competencies,
        provider_code_1: form.provider_code_1,
        provider_code_2: form.provider_code_2,
        provider_code_3: form.provider_code_3,
        status: 'draft',
      };

      const respData: Partial<JDResponsibility>[] = responsibilities.map((r, i) => ({
        title: r.title,
        description: r.description,
        category: r.category,
        percentage_of_time: Number(r.percentage_of_time) || 0,
        proficiency_level: r.expertise_level,
        is_essential: r.is_essential,
        display_order: i + 1,
      }));

      await jdService.saveProfile(profileData, versionData, respData);
      navigate('/workspace/job-description/profiles');
    } catch (e: any) {
      console.error(e);
      setErrors({ save: e?.message || 'Error saving profile' });
    }
    setSaving(false);
  };

  const handleRunAdvisory = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrors({ advisory: '' });
    try {
      // 1. Save draft first
      const versionData: Partial<JDVersion> = {
        id: existingProfile?.versions?.[existingProfile.versions.length - 1]?.id,
        title: form.title,
        career_function: form.career_function,
        job_family: form.job_family,
        career_level: form.career_level,
        business_type: form.business_type,
        job_purpose: form.job_purpose,
        typical_aliases: form.typical_aliases,
        team_size: form.team_size_range,
        geographic_responsibility: form.geographic_scope,
        supervised_career_levels: form.supervised_career_levels,
        stakeholders: form.stakeholders,
        education: form.education,
        experience_years: form.experience_years,
        certifications: form.certifications,
        languages: form.languages,
        technical_skills: form.technical_skills,
        behavioral_competencies: form.behavioral_competencies,
        provider_code_1: form.provider_code_1,
        provider_code_2: form.provider_code_2,
        provider_code_3: form.provider_code_3,
        status: 'draft',
      };

      const respData: Partial<JDResponsibility>[] = responsibilities.map((r, i) => ({
        title: r.title,
        description: r.description,
        category: r.category,
        percentage_of_time: Number(r.percentage_of_time) || 0,
        proficiency_level: r.expertise_level,
        is_essential: r.is_essential,
        display_order: i + 1,
      }));

      const profileData: Partial<JDProfile> = {
        id: existingProfile?.id,
        tenant_id: existingProfile?.tenant_id,
        reference_job_code: form.reference_job_code || `JP-${Date.now().toString(36).toUpperCase()}`,
        managerial_scope: form.managerial_scope,
        team_size_range: form.team_size_range,
        geographic_scope: form.geographic_scope,
        budget_responsibility: form.budget_responsibility,
      };

      const basicProfile = await jdService.saveProfile(profileData, versionData, respData);
      
      // Reload the full profile to fetch the joined versions and automatically-assigned IDs
      const savedProfile = await jdService.getProfileById(basicProfile.id);
      if (!savedProfile) throw new Error('Could not load profile after save');
      
      setExistingProfile(savedProfile);
      
      const latestVersion = savedProfile.versions?.[savedProfile.versions.length - 1];
      if (!latestVersion?.id) throw new Error('Could not determine version ID after save');

      // 2. Run Advisory Edge Function
      await jdService.invokeAdvisory(latestVersion.id);

      // 3. Reload profile to get generated advisory results
      const reloadedProfile = await jdService.getProfileById(savedProfile.id);
      if (reloadedProfile) setExistingProfile(reloadedProfile);
      
    } catch (e: any) {
      console.error(e);
      setErrors({ advisory: e?.message || t(`${bp}.error.generic`, 'An advisory issue occurred. Please review the profile data and try again.') });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen text-[rgb(var(--text-primary))]" data-testid="jd-builder-page">
      {/* Header */}
      <div className="pt-8 pb-2">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workspace/job-description/profiles')} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">
              {isEdit ? t(`${bp}.title_edit`) : t(`${bp}.title_new`)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Step Navigation */}
        <nav className="flex items-center gap-1 mb-8 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              data-testid={`step-${s}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                i === step
                  ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/30'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                i === step ? 'bg-emerald-600 text-white' : i < step ? 'bg-[rgb(var(--surface-card))] text-emerald-600 border border-emerald-600' : 'bg-[rgb(var(--surface-main))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border-primary))]'
              }`}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              {t(`${bp}.steps.${s}`)}
            </button>
          ))}
        </nav>

        {/* Errors */}
        {Object.values(errors).filter(v => typeof v === 'string' && v.trim() !== '').length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-600 font-medium whitespace-pre-wrap">
              {Object.values(errors).filter(v => typeof v === 'string' && v.trim() !== '').join('\n')}
            </div>
          </div>
        )}

        {/* Step 0: Key Details & Position Context */}
        {step === 0 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Position Context Section */}
            <section className="p-6 bg-indigo-500/5 dark:bg-emerald-500/5 border border-indigo-500/20 dark:border-emerald-500/20 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-emerald-500 mb-2">
                <GitBranch className="w-5 h-5" />
                <h3 className="font-semibold">{t(`${bp}.sections.position_context`, 'Position Architecture Context')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">
                    {t(`${bp}.fields.associate_position`, 'Associate with Organizational Position')}
                  </label>
                  <select 
                    value={form.is_new_position ? 'NEW' : form.position_id}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'NEW') setForm(f => ({ ...f, is_new_position: true, position_id: '' }));
                      else setForm(f => ({ ...f, is_new_position: false, position_id: val }));
                    }}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                  >
                    <option value="">{t('common.unassigned', 'Unassigned / Independent Role')}</option>
                    <option value="NEW">+ {t(`${bp}.actions.create_placeholder`, 'Create New Organizational Box')}</option>
                    <optgroup label={t('common.existing_positions', 'Existing Positions')}>
                      {positions.map(p => (
                        <option key={p.position_id} value={p.position_id}>{p.position_code} - {p.position_title}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {form.is_new_position && (
                  <div className="animate-in slide-in-from-left-2 duration-300">
                    <label className="block text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> {t(`${bp}.fields.new_position_title`, 'New Position Title')}
                    </label>
                    <input 
                      value={form.new_position_title}
                      onChange={e => setForm(f => ({ ...f, new_position_title: e.target.value }))}
                      placeholder={t(`${bp}.fields.placeholder_title`, 'e.g. Senior Talent Partner')}
                      className="w-full px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-indigo-600/80 dark:text-emerald-500/80 italic">
                {t(`${bp}.fields.position_context_hint`, 'Linking a profile to a position enables automatic reporting structure and org chart integration.')}
              </p>
            </section>

            {/* Core Details */}
            <div className="space-y-5" data-testid="step-key-details-form">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.job_title`)}</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.reference_code`)}</label>
                  <input value={form.reference_job_code} onChange={e => setForm(f => ({ ...f, reference_job_code: e.target.value }))} placeholder="JP-XXXX"
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.business_type`)}</label>
                  <select value={form.business_type} onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                    <option value="BUSINESS_SUPPORT">{t(`${bp}.fields.business_support`)}</option>
                    <option value="CORE_JOBS">{t(`${bp}.fields.core_jobs`)}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.career_function`)}</label>
                <select data-testid="select-function" value={form.career_function}
                  onChange={e => { setForm(f => ({ ...f, career_function: e.target.value, job_family: '' })); setSelectedFunction(e.target.value); }}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                  <option value="">{t(`${bp}.fields.select`)}</option>
                  {functions.map((fn: string) => <option key={fn} value={fn}>{fn}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.job_family`)}</label>
                  <select data-testid="select-family" value={form.job_family}
                    onChange={e => setForm(f => ({ ...f, job_family: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                    <option value="">{t(`${bp}.fields.select`)}</option>
                    {jobFamilies.map((fam: string) => <option key={fam} value={fam}>{fam}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.career_level`)}</label>
                  <select data-testid="select-level" value={form.career_level}
                    onChange={e => setForm(f => ({ ...f, career_level: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                    <option value="">{t(`${bp}.fields.select`)}</option>
                    {careerLevels.map((lv: string) => <option key={lv} value={lv}>{lv}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Scope & Purpose */}
        {step === 1 && (
          <div className="space-y-5" data-testid="step-scope-form">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.job_purpose`)}</label>
              <textarea value={form.job_purpose} onChange={e => setForm(f => ({ ...f, job_purpose: e.target.value }))} rows={3}
                className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.typical_titles`)}</label>
              <input value={form.typical_aliases} onChange={e => setForm(f => ({ ...f, typical_aliases: e.target.value }))}
                className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4 p-4 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-sm font-medium">
                  <Globe className="w-4 h-4" /> {t(`${bp}.fields.geographical_responsibility`)}
                </div>
                <select value={form.geographic_scope} onChange={e => setForm(f => ({ ...f, geographic_scope: e.target.value }))}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                  <option value="">{t(`${bp}.fields.select`)}</option>
                  {GEO_OPTS.map(o => <option key={o} value={o}>{t(`pages.job_description.geo_options.${o}`)}</option>)}
                </select>
              </div>

              <div className="space-y-4 p-4 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-sm font-medium">
                  <Users className="w-4 h-4" /> {t(`${bp}.fields.team_size`)}
                </div>
                <select value={form.team_size_range} onChange={e => setForm(f => ({ ...f, team_size_range: e.target.value }))}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                  <option value="">{t(`${bp}.fields.select`)}</option>
                  {TEAM_OPTS.map(o => <option key={o} value={o}>{t(`pages.job_description.team_options.${o}`)}</option>)}
                </select>
              </div>

              <div className="space-y-4 p-4 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-sm font-medium">
                  <Building2 className="w-4 h-4" /> {t(`${bp}.fields.managerial_scope`, 'Managerial Scope')}
                </div>
                <select value={form.managerial_scope} onChange={e => setForm(f => ({ ...f, managerial_scope: e.target.value }))}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                  <option value="">{t(`${bp}.fields.select`)}</option>
                  {MANAGERIAL_OPTS.map(o => <option key={o} value={o}>{t(`pages.job_description.managerial_options.${o}`)}</option>)}
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.budget_responsibility`)}</label>
                <select value={form.budget_responsibility} onChange={e => setForm(f => ({ ...f, budget_responsibility: e.target.value }))}
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                  <option value="">{t(`${bp}.fields.select`)}</option>
                  {BUDGET_OPTS.map(o => <option key={o} value={o}>{t(`pages.job_description.budget_options.${o}`)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.supervised_levels`)}</label>
              <div className="flex flex-wrap gap-2 p-3 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg min-h-[44px]">
                {careerLevels.map((lv: string) => {
                  const selected = (form.supervised_career_levels || '').split(',').filter(Boolean);
                  const isChecked = selected.includes(lv);
                  return (
                    <label key={lv} className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))] cursor-pointer hover:text-[rgb(var(--text-primary))]">
                      <input type="checkbox" checked={isChecked} onChange={e => {
                        const updated = e.target.checked ? [...selected, lv] : selected.filter(x => x !== lv);
                        setForm(f => ({ ...f, supervised_career_levels: updated.join(',') }));
                      }} className="rounded bg-[rgb(var(--surface-main))] border-[rgb(var(--border-primary))] dark:border-emerald-500/30" />
                      {lv.split(' ')[0]}
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.stakeholders`)}</label>
              <textarea value={form.stakeholders} onChange={e => setForm(f => ({ ...f, stakeholders: e.target.value }))} rows={3}
                className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
            </div>
          </div>
        )}

        {/* Step 2: Responsibilities */}
        {step === 2 && (
          <div data-testid="step-responsibilities-form">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{t(`${bp}.responsibilities.title`)}</h3>
              <button data-testid="add-responsibility-btn" onClick={addResponsibility}
                className="flex items-center gap-1 px-3 py-1.5 bg-[rgb(var(--surface-card))] hover:bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded-lg text-sm text-[rgb(var(--text-secondary))] transition-colors">
                <Plus className="w-4 h-4" /> {t(`${bp}.responsibilities.add`)}
              </button>
            </div>
            {/* Progress bar */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs text-[rgb(var(--text-muted))]">{t(`${bp}.responsibilities.total_label`)}:</span>
              <div className="flex-1 h-2 bg-[rgb(var(--surface-main))] rounded-full overflow-hidden border border-[rgb(var(--border-primary))]">
                <div className={`h-full rounded-full transition-all ${totalPct === 100 ? 'bg-emerald-500' : totalPct > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(totalPct, 100)}%` }} />
              </div>
              <span data-testid="total-percentage" className={`text-sm font-mono font-bold ${totalPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{totalPct}%</span>
              {totalPct !== 100 && <span className="text-xs text-amber-400">{t(`${bp}.responsibilities.must_equal_100`)}</span>}
            </div>
            {/* Responsibility cards */}
            <div className="space-y-4">
              {responsibilities.map((r, idx) => (
                <div key={idx} data-testid={`responsibility-${idx}`} className="p-4 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="w-7 h-7 rounded-full bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 flex items-center justify-center text-xs font-bold text-[rgb(var(--text-muted))] shrink-0 mt-1">{idx + 1}</span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_title`)}</label>
                        <input value={r.title} onChange={e => updateResp(idx, 'title', e.target.value)}
                          className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_description`)}</label>
                        <textarea value={r.description} onChange={e => updateResp(idx, 'description', e.target.value)} rows={2}
                          className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_skills`)}</label>
                        <input value={r.skills} onChange={e => updateResp(idx, 'skills', e.target.value)}
                          className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_expertise`)}</label>
                          <select value={r.expertise_level} onChange={e => updateResp(idx, 'expertise_level', e.target.value)}
                            className="w-full px-2 py-2 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-xs text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all">
                            {EXPERTISE.map(e => <option key={e} value={e}>{t(`${bp}.responsibilities.expertise_levels.${e}`)}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_time`)}</label>
                          <input data-testid={`resp-time-${idx}`} type="number" min={0} max={100} value={r.percentage_of_time}
                            onChange={e => updateResp(idx, 'percentage_of_time', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-2 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-xs text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.responsibilities.col_criticality`)}</label>
                          <select value={r.criticality} onChange={e => updateResp(idx, 'criticality', e.target.value)}
                            className="w-full px-2 py-2 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-xs text-[rgb(var(--text-secondary))] focus:outline-none focus:border-emerald-500/50 transition-all">
                            {CRITICALITY.map(c => <option key={c} value={c}>{t(`${bp}.responsibilities.criticality_levels.${c}`)}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))] cursor-pointer">
                          <input type="checkbox" checked={r.is_essential} onChange={e => updateResp(idx, 'is_essential', e.target.checked)}
                            className="rounded bg-[rgb(var(--surface-main))] border-[rgb(var(--border-primary))]" />
                          {t(`${bp}.responsibilities.col_essential`)}
                        </label>
                        <input value={r.category} onChange={e => updateResp(idx, 'category', e.target.value)}
                          placeholder={t(`${bp}.responsibilities.col_category`)}
                          className="px-2 py-1 bg-[rgb(var(--surface-main))] border border-[rgb(var(--border-primary))] rounded text-xs text-[rgb(var(--text-secondary))] focus:outline-none w-32" />
                      </div>
                    </div>
                    <button data-testid={`remove-resp-${idx}`} onClick={() => removeResponsibility(idx)}
                      className="text-[rgb(var(--text-muted))] hover:text-red-600 transition-colors mt-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Requirements */}
        {step === 3 && (
          <div className="space-y-5" data-testid="step-requirements-form">
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.education`)}</label>
              <textarea value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} rows={3}
                className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.experience_min`)}</label>
                <input type="text" value={form.experience_years} onChange={e => setForm(f => ({ ...f, experience_years: e.target.value }))}
                  placeholder="e.g. 3-5"
                  className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.additional_info`)}</label>
              <textarea value={form.additional_info} onChange={e => setForm(f => ({ ...f, additional_info: e.target.value }))} rows={3}
                className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
            </div>
            <div className="border-t border-[rgb(var(--border-primary))] dark:border-emerald-500/20 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-[rgb(var(--text-muted))] mb-3 uppercase tracking-wider">
                {t('pages.job_description.viewer.sections.hr_restricted')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.provider_1`)}</label>
                  <input value={form.provider_code_1} onChange={e => setForm(f => ({ ...f, provider_code_1: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.provider_2`)}</label>
                  <input value={form.provider_code_2} onChange={e => setForm(f => ({ ...f, provider_code_2: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[rgb(var(--text-muted))] mb-1">{t(`${bp}.fields.provider_3`)}</label>
                  <input value={form.provider_code_3} onChange={e => setForm(f => ({ ...f, provider_code_3: e.target.value }))}
                    className="w-full px-3 py-2 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/15 rounded-lg text-sm text-[rgb(var(--text-primary))] focus:outline-none focus:border-emerald-500/50 transition-all" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6" data-testid="step-review-form">
            
            {/* Classification Advisory Panel */}
            <AdvisoryCard 
              version={
                existingProfile?.versions?.length
                  ? { ...existingProfile.versions[existingProfile.versions.length - 1], career_level: form.career_level }
                  : { career_level: form.career_level } as any
              }
              onRunAdvisory={handleRunAdvisory} 
              isBuilderMode={true} 
            />

            {/* Phase 2: Compensation Intelligence Panel (Review Mode) */}
            <CompDiagnosticsPanel 
              scope="position"
              id={form.position_id || ''}
              tenantId={existingProfile?.tenant_id || ''}
              isVisible={true}
              metadata={{
                level: form.career_level || '',
                family: form.job_family || '',
                function: form.career_function || '',
                country: 'USA'
              }}
            />

            <div className="p-5 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-xl">
              <h3 className="text-sm font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">
                {t('pages.job_description.viewer.sections.key_details')}
              </h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.job_title`)}</dt><dd className="text-[rgb(var(--text-primary))] font-medium mt-0.5">{form.title || '-'}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.reference_code`)}</dt><dd className="text-[rgb(var(--text-primary))] font-mono mt-0.5">{form.reference_job_code || 'Auto'}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.career_function`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{form.career_function || '-'}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.job_family`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{form.job_family || '-'}</dd></div>
                <div>
                  <dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.career_level`)}</dt>
                  <dd className="text-[rgb(var(--text-primary))] mt-0.5 flex flex-wrap gap-2 items-center">
                    <span>{form.career_level || '-'}</span>
                    {form.career_level && levelMappings.find(m => m.internal_level === form.career_level) && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded border border-emerald-500/20 font-medium">
                        {`↳ ${levelMappings.find(m => m.internal_level === form.career_level)?.client_label}`}
                      </span>
                    )}
                  </dd>
                </div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.business_type`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{form.business_type || '-'}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.team_size`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{form.team_size_range ? t(`pages.job_description.team_options.${form.team_size_range}`) : '-'}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.geographical_responsibility`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{form.geographic_scope ? t(`pages.job_description.geo_options.${form.geographic_scope}`) : '-'}</dd></div>
              </dl>
            </div>
            <div className="p-5 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-xl">
              <h3 className="text-sm font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
                {t('pages.job_description.viewer.sections.purpose')}
              </h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">{form.job_purpose || '-'}</p>
            </div>
            {responsibilities.length > 0 && (
              <div className="p-5 bg-[rgb(var(--surface-card))] border border-[rgb(var(--border-primary))] dark:border-emerald-500/20 rounded-xl">
                <h3 className="text-sm font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">
                  {t('pages.job_description.viewer.sections.responsibilities')} ({totalPct}%)
                </h3>
                {responsibilities.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[rgb(var(--border-primary))]/30 dark:border-emerald-500/10 last:border-0">
                    <span className="text-xs text-[rgb(var(--text-muted))] font-mono w-8">{r.percentage_of_time}%</span>
                    <span className="text-sm font-medium text-[rgb(var(--text-primary))]">{r.title || '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[rgb(var(--border-primary))]">
          <div>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-4 py-2.5 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors">
                {t(`${bp}.actions.previous`)}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step < STEPS.length - 1 ? (
              <button data-testid="next-step-btn" onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors">
                {t(`${bp}.actions.next`)}
              </button>
            ) : (
              <button data-testid="save-draft-btn" onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50">
                {saving ? t('common.loading', 'Loading...') : t(`${bp}.actions.save_draft`)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
