import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import SemesterOverviewCard from '../components/dashboard/SemesterOverviewCard';
import RiskGaugeCard from '../components/dashboard/RiskGaugeCard';
import TopCoursesCard from '../components/dashboard/TopCoursesCard';
import AtRiskCoursesCard from '../components/dashboard/AtRiskCoursesCard';
import AttendanceVsGradeChart from '../components/dashboard/AttendanceVsGradeChart';
import Spinner from '../components/common/Spinner';

export default function DashboardPage() {
  const { data: riskResults, isLoading } = useQuery({
    queryKey: ['risk'],
    queryFn: async () => (await client.get('/risk')).data,
  });

  if (isLoading) return <Spinner />;

  const results = riskResults ?? [];
  const topRisk = [...results].sort((a, b) => b.riskScore - a.riskScore)[0];

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-bold text-slate-900">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <SemesterOverviewCard riskResults={results} />
        <RiskGaugeCard topRiskResult={topRisk} />
        <TopCoursesCard riskResults={results} />
        <AtRiskCoursesCard riskResults={results} />
      </div>
      <div className="mt-4">
        <AttendanceVsGradeChart riskResults={results} />
      </div>
    </div>
  );
}
