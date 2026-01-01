/**
 * Demand Forecasting Component
 * ML-powered demand forecasting with seasonal analysis and trend analysis
 */
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import Card from '../ui/Card'
import Button from '../ui/Button'
import toast from 'react-hot-toast'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Product {
  id: number
  name: string
  sku: string
}

interface ForecastResult {
  forecast_demand: number
  base_forecast: number
  seasonal_factor: number
  trend: {
    trend: string
    slope: number
    direction: string
  }
  reorder_point: {
    reorder_point: number
    lead_time_demand: number
    safety_stock: number
    average_daily_demand: number
    lead_time_days: number
  }
  optimal_order_quantity: {
    eoq: number
    annual_demand: number
    orders_per_year: number
    days_between_orders: number
    total_cost: number
  }
  days_ahead: number
  confidence: string
}

export default function DemandForecasting() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null)
  const [daysAhead, setDaysAhead] = useState(30)

  // Fetch products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/inventory/products/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch branches
  const { data: branches } = useQuery<any[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/core/branches/')
      return response.data?.results || response.data || []
    },
  })

  // Fetch forecast
  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery<ForecastResult>({
    queryKey: ['forecast', selectedProduct, selectedBranch, daysAhead],
    queryFn: async () => {
      if (!selectedProduct) throw new Error('Product required')
      const params: any = {
        product_id: selectedProduct,
        days_ahead: daysAhead,
      }
      if (selectedBranch) params.branch_id = selectedBranch
      
      const response = await api.get('/inventory/forecasting/forecast/', { params })
      return response.data
    },
    enabled: !!selectedProduct,
  })

  // Fetch reorder point
  const { data: reorderPoint } = useQuery({
    queryKey: ['reorder-point', selectedProduct, selectedBranch],
    queryFn: async () => {
      if (!selectedProduct) throw new Error('Product required')
      const params: any = { product_id: selectedProduct }
      if (selectedBranch) params.branch_id = selectedBranch
      
      const response = await api.get('/inventory/forecasting/reorder_point/', { params })
      return response.data
    },
    enabled: !!selectedProduct,
  })

  const forecastChartData = forecast ? {
    labels: ['Base Forecast', 'Seasonal Adjusted', 'Trend Adjusted'],
    datasets: [
      {
        label: 'Demand Forecast',
        data: [
          parseFloat(forecast.base_forecast.toString()),
          parseFloat((forecast.base_forecast * forecast.seasonal_factor).toString()),
          parseFloat(forecast.forecast_demand.toString()),
        ],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
      },
    ],
  } : null

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Demand Forecasting</h1>
        <p style={{ margin: '8px 0 0', color: '#7f8c8d', fontSize: '14px' }}>
          ML-powered demand forecasting with seasonal analysis and trend analysis
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Product</label>
            <select
              className="input"
              value={selectedProduct || ''}
              onChange={(e) => setSelectedProduct(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Select Product...</option>
              {products?.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Branch</label>
            <select
              className="input"
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All Branches</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Forecast Period (Days)</label>
            <input
              type="number"
              className="input"
              value={daysAhead}
              onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
            />
          </div>
          <Button onClick={() => refetchForecast()} disabled={!selectedProduct || forecastLoading}>
            {forecastLoading ? 'Loading...' : 'Forecast'}
          </Button>
        </div>
      </Card>

      {/* Forecast Results */}
      {forecast && (
        <>
          {/* Forecast Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <Card>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Forecasted Demand</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
                {parseFloat(forecast.forecast_demand.toString()).toFixed(0)}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>units in {daysAhead} days</div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Base Forecast</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {parseFloat(forecast.base_forecast.toString()).toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>units per day</div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Seasonal Factor</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: parseFloat(forecast.seasonal_factor.toString()) > 1 ? '#28a745' : '#ffc107' }}>
                {parseFloat(forecast.seasonal_factor.toString()).toFixed(2)}x
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                {parseFloat(forecast.seasonal_factor.toString()) > 1 ? 'Above average' : 'Below average'}
              </div>
            </Card>

            <Card>
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>Trend</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: forecast.trend.trend === 'increasing' ? '#28a745' : forecast.trend.trend === 'decreasing' ? '#dc3545' : '#6c757d' }}>
                {forecast.trend.trend.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                Slope: {parseFloat(forecast.trend.slope.toString()).toFixed(3)}
              </div>
            </Card>
          </div>

          {/* Forecast Chart */}
          {forecastChartData && (
            <Card style={{ marginBottom: '24px' }}>
              <h3 style={{ marginTop: 0 }}>Forecast Breakdown</h3>
              <div style={{ height: '300px' }}>
                <Line data={forecastChartData} options={{ maintainAspectRatio: false }} />
              </div>
            </Card>
          )}

          {/* Reorder Point & EOQ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Reorder Point */}
            {forecast.reorder_point && (
              <Card>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Reorder Point Analysis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                    <span style={{ fontWeight: '600' }}>Reorder Point:</span>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: '#667eea' }}>
                      {parseFloat(forecast.reorder_point.reorder_point.toString()).toFixed(0)} units
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Average Daily Demand:</span>
                    <span>{parseFloat(forecast.reorder_point.average_daily_demand.toString()).toFixed(2)} units/day</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lead Time:</span>
                    <span>{parseFloat(forecast.reorder_point.lead_time_days.toString()).toFixed(0)} days</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lead Time Demand:</span>
                    <span>{parseFloat(forecast.reorder_point.lead_time_demand.toString()).toFixed(0)} units</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Safety Stock:</span>
                    <span style={{ color: '#ffc107', fontWeight: '600' }}>
                      {parseFloat(forecast.reorder_point.safety_stock.toString()).toFixed(0)} units
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* EOQ */}
            {forecast.optimal_order_quantity && (
              <Card>
                <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Economic Order Quantity (EOQ)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                    <span style={{ fontWeight: '600' }}>Optimal Order Qty:</span>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: '#28a745' }}>
                      {parseFloat(forecast.optimal_order_quantity.eoq.toString()).toFixed(0)} units
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Annual Demand:</span>
                    <span>{parseFloat(forecast.optimal_order_quantity.annual_demand.toString()).toFixed(0)} units</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Orders Per Year:</span>
                    <span>{parseFloat(forecast.optimal_order_quantity.orders_per_year.toString()).toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Days Between Orders:</span>
                    <span>{parseFloat(forecast.optimal_order_quantity.days_between_orders.toString()).toFixed(0)} days</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Cost:</span>
                    <span style={{ color: '#6c757d' }}>
                      ${parseFloat(forecast.optimal_order_quantity.total_cost.toString()).toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {!selectedProduct && (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Select a Product</div>
            <div>Choose a product to view demand forecasting and reorder recommendations</div>
          </div>
        </Card>
      )}
    </div>
  )
}


