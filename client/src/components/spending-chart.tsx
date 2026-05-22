import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MonthlySpending, SpendingByCategory } from "@shared/schema";
import { useCurrency } from "@/lib/currency-context";

interface SpendingChartProps {
  monthlyData: MonthlySpending[] | undefined;
  categoryData: SpendingByCategory[] | undefined;
  isLoading: boolean;
  trendLabel?: string;
}

const COLORS = [

  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SpendingChart({ monthlyData, categoryData, isLoading, trendLabel }: SpendingChartProps) {
  const { formatAmount } = useCurrency();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // API returns spending values in USD. Keep them raw and format as USD at render time.
  const totalCategoryAmount = categoryData?.reduce((sum, entry) => sum + (entry.amount || 0), 0) ?? 0;
  const hasMonthlyData = monthlyData && monthlyData.length > 0;
  const hasCategoryData = categoryData && categoryData.length > 0 && totalCategoryAmount > 0;
  const hasCategorySeries = categoryData && categoryData.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-chart-1">
            {formatAmount(payload[0].value, 'USD')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium capitalize">
            {payload[0].payload.category.replace("-", " ")}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatAmount(payload[0].value, 'USD')} ({payload[0].payload.percentage.toFixed(1)}%)
          </p>
          <p className="text-xs text-muted-foreground">
            {payload[0].payload.count} subscription{payload[0].payload.count > 1 ? "s" : ""}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Spending Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="trend" data-testid="tab-trend">
              {trendLabel || "6-Month Trend"}
            </TabsTrigger>
            <TabsTrigger value="category" data-testid="tab-category">
              By Category
            </TabsTrigger>
          </TabsList>
          <TabsContent value="trend">
            <div className="h-[300px]" data-testid="chart-trend">
              {!hasMonthlyData ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-muted-foreground text-sm">No spending data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Add subscriptions to see your spending trends</p>
                  </div>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(value) => formatAmount(value, 'USD')}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
          <TabsContent value="category">
            <div className="h-[300px]" data-testid="chart-category">
              {!hasCategorySeries ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-muted-foreground text-sm">No category data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Add subscriptions to see spending by category</p>
                  </div>
                </div>
              ) : !hasCategoryData ? (
                <div className="flex flex-col gap-3 h-full overflow-auto">
                  <p className="text-muted-foreground text-sm">Category spending is available, but no category totals are present for the selected period.</p>
                  <div className="grid gap-2">
                    {categoryData?.map((entry, index) => (
                      <div key={index} className="rounded-lg border border-border/70 bg-card/80 p-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium capitalize">{entry.category.replace("-", " ")}</span>
                          <span>{formatAmount(entry.amount || 0, 'USD')}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{entry.count} subscription{entry.count === 1 ? '' : 's'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="category"
                    label={renderLabel}
                    labelLine={false}
                  >
                    {categoryData?.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-sm capitalize text-foreground">
                        {value.replace("-", " ")}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
