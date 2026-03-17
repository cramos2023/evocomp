import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit, Clock, CheckCircle, Archive } from 'lucide-react';
import { jdService } from '../services/jdService';
import type { JDProfile, JDVersion } from '../types/jd';
import { AdvisoryCard } from '../components/AdvisoryCard';
import { CompDiagnosticsPanel } from '../components/CompDiagnosticsPanel';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  active: 'bg-emerald-900/60 text-emerald-300',
  archived: 'bg-zinc-800 text-zinc-500',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  draft: Clock,
  active: CheckCircle,
  archived: Archive,
};

export default function JDViewerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const vp = 'pages.job_description.viewer';
  const bp = 'pages.job_description.builder';

  const [profile, setProfile] = useState<JDProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelMappings, setLevelMappings] = useState<any[]>([]);
  const [matchedPositionId, setMatchedPositionId] = useState<string | null>(null);

  useEffect(() => {
    jdService.getClassificationLevelMappings().then(setLevelMappings).catch(console.error);
    
    // Find a position that uses this profile
    if (id) {
      supabase.from('positions')
        .select('position_id')
        .eq('job_profile_id', id)
        .limit(1)
        .maybeSingle()
        .then(({ data }: { data: any }) => setMatchedPositionId(data?.position_id || null));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    jdService.getProfileById(id)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleRunAdvisory = async () => {
    if (!profile) return;
    const currentVersion = profile.versions?.[profile.versions.length - 1];
    if (!currentVersion) return;
    
    // Set loading indicator via some localized state if preferred, but for now 
    // the AdvisoryCard handles its own 'running' state visually during the promise execution.
    try {
      await jdService.invokeAdvisory(currentVersion.id);
      const reloadedProfile = await jdService.getProfileById(profile.id);
      if (reloadedProfile) setProfile(reloadedProfile);
    } catch (e: any) {
      console.error('Error running advisory:', e);
      // Optional: error toast or state here
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[rgb(var(--text-muted))]">
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[rgb(var(--text-muted))]">
        {t(`${vp}.not_found`, 'Profile not found')}
      </div>
    );
  }

  const v: JDVersion | undefined = profile.versions?.[profile.versions.length - 1];
  const st = v?.status || 'draft';
  const StatusIcon = STATUS_ICONS[st] || Clock;

  return (
    <div className="min-h-screen text-[rgb(var(--text-primary))]" data-testid="jd-viewer-page">
      {/* Header */}
      <div className="pt-8 pb-2">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workspace/job-description/profiles')} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-[rgb(var(--text-secondary))]">
              {v?.title || profile.reference_job_code}
            </span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[st]}`}>
            <StatusIcon className="w-3 h-3" />
            {t(`pages.job_description.statuses.${st}`)}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Title + Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 data-testid="viewer-title" className="text-2xl font-bold">{v?.title || '-'}</h1>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-1 font-mono">
              {profile.reference_job_code} &middot; {t(`${vp}.version`)} {v?.version_number || 1}
            </p>
          </div>
          <button
            data-testid="edit-btn"
            onClick={() => navigate(`/workspace/job-description/profiles/${id}/edit`)}
            className="flex items-center gap-1 px-4 py-2 border border-[rgb(var(--border-primary))] hover:border-emerald-600/50 rounded-lg text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <Edit className="w-4 h-4" />
            {t(`${vp}.edit`)}
          </button>
        </div>

        <AdvisoryCard 
          version={v || null} 
          onRunAdvisory={handleRunAdvisory} 
          isBuilderMode={false} 
        />

        {/* Phase 2: Compensation Intelligence Panel */}
        <CompDiagnosticsPanel 
          scope="position"
          id={matchedPositionId || ''}
          tenantId={profile.tenant_id}
          isVisible={true}
          metadata={{
            level: v?.career_level || '',
            family: v?.job_family || '',
            function: v?.career_function || '',
            country: 'USA' // Defaulting for MVP
          }}
        />

        {/* Key Details */}
        <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
          <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">{t(`${vp}.sections.key_details`)}</h2>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.career_function`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.career_function || '-'}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.job_family`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.job_family || '-'}</dd></div>
            <div>
              <dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.career_level`)}</dt>
              <dd className="text-[rgb(var(--text-primary))] mt-0.5 flex flex-wrap gap-2 items-center">
                <span>{v?.career_level || '-'}</span>
                {v?.career_level && levelMappings.find((m: any) => m.internal_level === v.career_level) && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded border border-emerald-500/20 font-medium">
                    {`↳ ${levelMappings.find((m: any) => m.internal_level === v.career_level)?.client_label}`}
                  </span>
                )}
              </dd>
            </div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.business_type`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.business_type || '-'}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.team_size`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.team_size ? t(`pages.job_description.team_options.${v.team_size}`) : '-'}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.geographical_responsibility`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.geographic_responsibility ? t(`pages.job_description.geo_options.${v.geographic_responsibility}`) : '-'}</dd></div>
          </dl>
        </section>

        {/* Purpose */}
        {v?.job_purpose && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.purpose`)}</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed whitespace-pre-wrap">{v.job_purpose}</p>
          </section>
        )}

        {/* Typical Titles */}
        {v?.typical_aliases && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.typical_titles`)}</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))]">{v.typical_aliases}</p>
          </section>
        )}

        {/* Responsibilities */}
        {v?.responsibilities && v.responsibilities.length > 0 && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-4">{t(`${vp}.sections.responsibilities`)}</h2>
            <div className="space-y-3">
              {v.responsibilities.map((r, i) => (
                <div key={i} className="flex gap-4 py-3 border-b border-[rgb(var(--border-primary))]/30 last:border-0">
                  <div className="w-12 text-center shrink-0">
                    <span className="text-lg font-bold text-emerald-400">{r.percentage_of_time}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))]">{r.title}</h4>
                      {r.proficiency_level && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-[rgb(var(--text-muted))]">
                          {t(`${bp}.responsibilities.expertise_levels.${r.proficiency_level}`, r.proficiency_level)}
                        </span>
                      )}
                      {r.is_essential && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/40 text-emerald-400">
                          {t(`${bp}.responsibilities.col_essential`)}
                        </span>
                      )}
                    </div>
                    {r.description && <p className="text-xs text-[rgb(var(--text-muted))] mt-1 leading-relaxed">{r.description}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[rgb(var(--border-primary))] flex justify-end">
              <span className="text-xs font-medium text-[rgb(var(--text-muted))]">
                {t(`${bp}.responsibilities.total_label`)}:{' '}
                <strong className="text-emerald-400">
                  {v.responsibilities.reduce((s, r) => s + (r.percentage_of_time || 0), 0)}%
                </strong>
              </span>
            </div>
          </section>
        )}

        {/* Requirements */}
        {(v?.education || v?.experience_years) && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.requirements`)}</h2>
            {v?.education && <p className="text-sm text-[rgb(var(--text-secondary))] mb-2">{v.education}</p>}
            {v?.experience_years && <p className="text-sm text-[rgb(var(--text-muted))]">{t(`${bp}.fields.experience_min`)}: {v.experience_years}</p>}
          </section>
        )}

        {/* Stakeholders */}
        {v?.stakeholders && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.stakeholders`)}</h2>
            <p className="text-sm text-[rgb(var(--text-secondary))]">{v.stakeholders}</p>
          </section>
        )}

        {/* HR Restricted */}
        {(v?.provider_code_1 || v?.provider_code_2 || v?.provider_code_3) && (
          <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
            <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.hr_restricted`)}</h2>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              {v?.provider_code_1 && <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.provider_1`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5 font-mono">{v.provider_code_1}</dd></div>}
              {v?.provider_code_2 && <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.provider_2`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5 font-mono">{v.provider_code_2}</dd></div>}
              {v?.provider_code_3 && <div><dt className="text-[rgb(var(--text-muted))]">{t(`${bp}.fields.provider_3`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5 font-mono">{v.provider_code_3}</dd></div>}
            </dl>
          </section>
        )}

        {/* Governance */}
        <section className="p-5 bg-[rgb(var(--surface-card))]/70 border border-[rgb(var(--border-primary))]/60 dark:border-emerald-500/20 rounded-xl">
          <h2 className="text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider mb-3">{t(`${vp}.sections.governance`)}</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${vp}.version`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.version_number || 1}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${vp}.status`)}</dt><dd className="mt-0.5"><span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[st]}`}>{t(`pages.job_description.statuses.${st}`)}</span></dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t(`${vp}.created`)}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.created_at ? new Date(v.created_at).toLocaleDateString() : '-'}</dd></div>
            <div><dt className="text-[rgb(var(--text-muted))]">{t('pages.job_description.repository.columns.updated', 'Updated')}</dt><dd className="text-[rgb(var(--text-primary))] mt-0.5">{v?.updated_at ? new Date(v.updated_at).toLocaleDateString() : '-'}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
