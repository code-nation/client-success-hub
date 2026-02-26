import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  Smile,
  ChevronRight,
  Users,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface OrgMetrics {
  id: string;
  name: string;
  totalHours: number;
  usedHours: number;
  usagePercent: number;
}

// Mock data for preview mode
const mockFinancialData = {
  totalABR: 125.50,
  totalRevenue: 47500,
  monthlyRecurring: 12500,
  revenueGrowth: 8.5,
  clientABR: [
    { name: 'Acme Corp', abr: 145.00, revenue: 8700, profitable: true },
    { name: 'TechStart Inc', abr: 135.20, revenue: 5400, profitable: true },
    { name: 'Global Services', abr: 128.50, revenue: 12850, profitable: true },
    { name: 'Local Business', abr: 98.00, revenue: 2940, profitable: false },
    { name: 'Startup XYZ', abr: 85.50, revenue: 1710, profitable: false },
  ],
  topSpenders: [
    { name: 'Global Services', spent: 12850 },
    { name: 'Acme Corp', spent: 8700 },
    { name: 'TechStart Inc', spent: 5400 },
  ],
  mrrByProduct: [
    { product: 'Retainer - Pro', mrr: 5500, subscribers: 11, percentOfTotal: 44 },
    { product: 'Retainer - Standard', mrr: 3750, subscribers: 15, percentOfTotal: 30 },
    { product: 'Add-on: Priority Support', mrr: 1500, subscribers: 6, percentOfTotal: 12 },
    { product: 'Add-on: Extended Hours', mrr: 1000, subscribers: 4, percentOfTotal: 8 },
    { product: 'Retainer - Starter', mrr: 750, subscribers: 5, percentOfTotal: 6 },
  ],
};

const mockChurnData = [
  { name: 'Startup XYZ', riskLevel: 'high', score: 78, factors: ['Low usage', 'No tickets in 30 days', 'Late payment'] },
  { name: 'Local Business', riskLevel: 'medium', score: 52, factors: ['Declining usage', 'Low satisfaction'] },
  { name: 'Retail Co', riskLevel: 'medium', score: 45, factors: ['Ticket frequency down'] },
  { name: 'Agency Partner', riskLevel: 'low', score: 22, factors: ['Minor usage dip'] },
];

const mockSLAData = {
  avgResponseTime: 2.4, // hours
  avgResolutionTime: 18.5, // hours
  slaCompliance: 94.2,
  byClient: [
    { name: 'Acme Corp', responseTime: 1.8, resolutionTime: 12.5, compliance: 98 },
    { name: 'TechStart Inc', responseTime: 2.1, resolutionTime: 16.2, compliance: 95 },
    { name: 'Global Services', responseTime: 3.2, resolutionTime: 24.1, compliance: 88 },
  ],
};

const mockSatisfactionData = {
  nps: 72,
  avgRating: 4.3,
  responseRate: 68,
  trend: 'up',
  byClient: [
    { name: 'Acme Corp', score: 4.8, surveys: 12 },
    { name: 'TechStart Inc', score: 4.5, surveys: 8 },
    { name: 'Global Services', score: 3.9, surveys: 15 },
  ],
};

export default function OpsDashboard() {
  const { profile } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [totalClients, setTotalClients] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [usedHours, setUsedHours] = useState(0);
  const [avgSatisfaction, setAvgSatisfaction] = useState<number | null>(null);
  const [topUsage, setTopUsage] = useState<OrgMetrics[]>([]);
  const [lowUsage, setLowUsage] = useState<OrgMetrics[]>([]);
  const [approachingLimit, setApproachingLimit] = useState<OrgMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState<string>('6');

  // Revenue projection calculation using compound growth formula
  const revenueProjection = useMemo(() => {
    const currentMRR = mockFinancialData.monthlyRecurring;
    const monthlyGrowthRate = mockFinancialData.revenueGrowth / 100 / 12; // Convert annual to monthly
    const months = parseInt(projectionMonths);
    
    const projectionData = [];
    const currentDate = new Date();
    
    for (let i = 0; i <= months; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      
      // Compound growth: MRR * (1 + monthlyRate)^months
      const projectedMRR = currentMRR * Math.pow(1 + monthlyGrowthRate, i);
      // Cumulative revenue is sum of all MRR to date
      const cumulativeRevenue = i === 0 
        ? mockFinancialData.totalRevenue 
        : mockFinancialData.totalRevenue + (currentMRR * ((Math.pow(1 + monthlyGrowthRate, i) - 1) / monthlyGrowthRate));
      
      projectionData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        mrr: Math.round(projectedMRR),
        cumulative: Math.round(cumulativeRevenue),
        isProjection: i > 0,
      });
    }
    
    return projectionData;
  }, [projectionMonths]);

  useEffect(() => {
    if (isPreviewMode) {
      // Use mock data in preview mode
      setTotalClients(8);
      setTotalHours(200);
      setUsedHours(142);
      setAvgSatisfaction(4.3);
      setTopUsage([
        { id: '1', name: 'Global Services', totalHours: 50, usedHours: 48, usagePercent: 96 },
        { id: '2', name: 'Acme Corp', totalHours: 40, usedHours: 35, usagePercent: 87.5 },
        { id: '3', name: 'TechStart Inc', totalHours: 30, usedHours: 24, usagePercent: 80 },
      ]);
      setLowUsage([
        { id: '4', name: 'Startup XYZ', totalHours: 20, usedHours: 3, usagePercent: 15 },
        { id: '5', name: 'Local Business', totalHours: 15, usedHours: 3, usagePercent: 20 },
      ]);
      setApproachingLimit([
        { id: '1', name: 'Global Services', totalHours: 50, usedHours: 48, usagePercent: 96 },
        { id: '6', name: 'Agency Partner', totalHours: 25, usedHours: 23, usagePercent: 92 },
      ]);
      setIsLoading(false);
    } else {
      fetchDashboardData();
    }
  }, [isPreviewMode]);

  async function fetchDashboardData() {
    try {
      const { count: clients } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      setTotalClients(clients || 0);

      const today = new Date().toISOString().split('T')[0];
      const { data: allocations } = await supabase
        .from('hour_allocations')
        .select(`
          id, total_hours, used_hours, organization_id,
          organizations (id, name)
        `)
        .lte('period_start', today)
        .gte('period_end', today);

      if (allocations) {
        let total = 0;
        let used = 0;
        const metrics: OrgMetrics[] = [];

        allocations.forEach((alloc: any) => {
          total += Number(alloc.total_hours) || 0;
          used += Number(alloc.used_hours) || 0;

          if (alloc.organizations) {
            metrics.push({
              id: alloc.organizations.id,
              name: alloc.organizations.name,
              totalHours: Number(alloc.total_hours) || 0,
              usedHours: Number(alloc.used_hours) || 0,
              usagePercent: alloc.total_hours > 0
                ? (Number(alloc.used_hours) / Number(alloc.total_hours)) * 100
                : 0,
            });
          }
        });

        setTotalHours(total);
        setUsedHours(used);

        const sorted = [...metrics].sort((a, b) => b.usagePercent - a.usagePercent);
        setTopUsage(sorted.slice(0, 5));
        setLowUsage(sorted.filter(m => m.usagePercent < 25).slice(0, 5));
        setApproachingLimit(sorted.filter(m => m.usagePercent >= 85).slice(0, 5));
      }

      const { data: surveys } = await supabase
        .from('satisfaction_surveys')
        .select('rating')
        .not('rating', 'is', null);

      if (surveys && surveys.length > 0) {
        const avg = surveys.reduce((sum, s) => sum + (s.rating || 0), 0) / surveys.length;
        setAvgSatisfaction(avg);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const utilizationPercent = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;

  return (
    <DashboardLayout role="ops">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ops Command Center</h1>
            <p className="text-muted-foreground">
              Financial and operational metrics overview
            </p>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <strong>Preview Mode:</strong> Displaying sample data for demonstration purposes.
            </AlertDescription>
          </Alert>
        )}

        {/* ================= FINANCIAL OVERVIEW ================= */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Overview
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total ABR */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Billable Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${mockFinancialData.totalABR.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Per hour across all retainers</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  +5.2% from last month
                </div>
              </CardContent>
            </Card>

            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${mockFinancialData.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Year to date</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  +{mockFinancialData.revenueGrowth}% growth
                </div>
              </CardContent>
            </Card>

            {/* Monthly Recurring */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${mockFinancialData.monthlyRecurring.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">MRR from subscriptions</p>
              </CardContent>
            </Card>

            {/* Total Clients */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">With active retainers</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-client ABR & Top Spenders */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per-Client ABR</CardTitle>
                <CardDescription>Sorted by profitability (highest to lowest)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockFinancialData.clientABR.map((client, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.name}</span>
                        {client.profitable ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">Profitable</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">Below Target</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${client.abr.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">/hr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Spending Clients</CardTitle>
                <CardDescription>Revenue leaderboard this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockFinancialData.topSpenders.map((client, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                        <span className="font-medium">{client.name}</span>
                      </div>
                      <span className="font-semibold">${client.spent.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MRR by Product */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">MRR by Product</CardTitle>
              <CardDescription>Monthly recurring revenue breakdown by subscription type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockFinancialData.mrrByProduct.map((product, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.product}</span>
                        <Badge variant="secondary" className="text-xs">
                          {product.subscribers} subscribers
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">${product.mrr.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1">({product.percentOfTotal}%)</span>
                      </div>
                    </div>
                    <Progress value={product.percentOfTotal} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                <span className="font-medium">Total MRR</span>
                <span className="font-bold">${mockFinancialData.monthlyRecurring.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Projection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Revenue Projection</CardTitle>
                  <CardDescription>Based on current MRR and {mockFinancialData.revenueGrowth}% annual growth rate</CardDescription>
                </div>
                <ToggleGroup type="single" value={projectionMonths} onValueChange={(v) => v && setProjectionMonths(v)}>
                  <ToggleGroupItem value="3" aria-label="3 months">3M</ToggleGroupItem>
                  <ToggleGroupItem value="6" aria-label="6 months">6M</ToggleGroupItem>
                  <ToggleGroupItem value="12" aria-label="12 months">12M</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueProjection} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `$${value.toLocaleString()}`,
                        name === 'mrr' ? 'Projected MRR' : 'Cumulative Revenue'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#mrrGradient)"
                      name="mrr"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Current MRR</p>
                  <p className="font-semibold">${mockFinancialData.monthlyRecurring.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projected MRR ({projectionMonths}M)</p>
                  <p className="font-semibold text-primary">
                    ${revenueProjection[revenueProjection.length - 1]?.mrr.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MRR Growth</p>
                  <p className="font-semibold text-green-600">
                    +{((revenueProjection[revenueProjection.length - 1]?.mrr / mockFinancialData.monthlyRecurring - 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= HOURS ANALYTICS ================= */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Hours Analytics
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Utilization</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{utilizationPercent.toFixed(0)}%</div>
                <Progress value={utilizationPercent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {usedHours.toFixed(0)} / {totalHours.toFixed(0)} hours used
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hours Purchased</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHours.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">This billing period</p>
              </CardContent>
            </Card>

            <Card className={approachingLimit.length > 0 ? 'border-amber-500' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Approaching Limit</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${approachingLimit.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approachingLimit.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Clients at 85%+ usage</p>
              </CardContent>
            </Card>
          </div>

          {/* Per-client breakdown */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Highest Usage</CardTitle>
                <CardDescription>Clients using the most hours</CardDescription>
              </CardHeader>
              <CardContent>
                {topUsage.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="space-y-4">
                    {topUsage.map((org) => (
                      <div key={org.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{org.name}</span>
                          <span className="text-muted-foreground">
                            {org.usedHours.toFixed(1)} / {org.totalHours} hrs ({org.usagePercent.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={org.usagePercent} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Utilization Trends</CardTitle>
                <CardDescription>Usage patterns over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Trend chart placeholder</p>
                  <p className="text-xs">Historical usage data visualization</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================= CHURN RISK DASHBOARD ================= */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Churn Risk Dashboard
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">High Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockChurnData.filter(c => c.riskLevel === 'high').length}</div>
                <p className="text-xs text-muted-foreground">Score 70+</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-600">Medium Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockChurnData.filter(c => c.riskLevel === 'medium').length}</div>
                <p className="text-xs text-muted-foreground">Score 40-69</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Low Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockChurnData.filter(c => c.riskLevel === 'low').length}</div>
                <p className="text-xs text-muted-foreground">Score &lt;40</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>• Hours usage patterns</p>
                  <p>• Ticket frequency</p>
                  <p>• Payment history</p>
                  <p>• Satisfaction scores</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">At-Risk Clients</CardTitle>
              <CardDescription>Clients needing attention, sorted by risk score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockChurnData.map((client, i) => (
                  <div key={i} className="flex items-start justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.name}</span>
                        <Badge variant={
                          client.riskLevel === 'high' ? 'destructive' : 
                          client.riskLevel === 'medium' ? 'default' : 'secondary'
                        }>
                          {client.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.factors.map((factor, j) => (
                          <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded">{factor}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{client.score}</div>
                      <div className="text-xs text-muted-foreground">Risk Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= CLIENT SATISFACTION ================= */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Smile className="h-5 w-5" />
            Client Satisfaction
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+{mockSatisfactionData.nps}</div>
                <p className="text-xs text-muted-foreground mt-1">Net Promoter Score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                <Smile className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockSatisfactionData.avgRating}/5</div>
                <p className="text-xs text-muted-foreground mt-1">Post-ticket surveys</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3" />
                  Trending up
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockSatisfactionData.responseRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Survey completion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Surveys Sent</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">35</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Client Sentiment</CardTitle>
              <CardDescription>Satisfaction tracking by client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockSatisfactionData.byClient.map((client, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-muted-foreground">({client.surveys} surveys)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={client.score * 20} className="w-24" />
                      <span className="font-semibold w-12 text-right">{client.score}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links removed - all content is on this dashboard */}
      </div>
    </DashboardLayout>
  );
}
