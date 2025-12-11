/**
 * Comprehensive list of countries with their states/provinces/regions
 * ISO 3166-2 standard for country subdivisions
 */

export interface StateProvince {
  code: string
  name: string
  type: 'state' | 'province' | 'region' | 'territory' | 'district' | 'county' | 'prefecture' | 'autonomous community' | 'municipality'
}

export interface CountryWithStates {
  countryCode: string
  countryName: string
  states: StateProvince[]
}

/**
 * Major countries with their administrative divisions
 */
export const COUNTRIES_WITH_STATES: CountryWithStates[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    states: [
      { code: 'AL', name: 'Alabama', type: 'state' },
      { code: 'AK', name: 'Alaska', type: 'state' },
      { code: 'AZ', name: 'Arizona', type: 'state' },
      { code: 'AR', name: 'Arkansas', type: 'state' },
      { code: 'CA', name: 'California', type: 'state' },
      { code: 'CO', name: 'Colorado', type: 'state' },
      { code: 'CT', name: 'Connecticut', type: 'state' },
      { code: 'DE', name: 'Delaware', type: 'state' },
      { code: 'FL', name: 'Florida', type: 'state' },
      { code: 'GA', name: 'Georgia', type: 'state' },
      { code: 'HI', name: 'Hawaii', type: 'state' },
      { code: 'ID', name: 'Idaho', type: 'state' },
      { code: 'IL', name: 'Illinois', type: 'state' },
      { code: 'IN', name: 'Indiana', type: 'state' },
      { code: 'IA', name: 'Iowa', type: 'state' },
      { code: 'KS', name: 'Kansas', type: 'state' },
      { code: 'KY', name: 'Kentucky', type: 'state' },
      { code: 'LA', name: 'Louisiana', type: 'state' },
      { code: 'ME', name: 'Maine', type: 'state' },
      { code: 'MD', name: 'Maryland', type: 'state' },
      { code: 'MA', name: 'Massachusetts', type: 'state' },
      { code: 'MI', name: 'Michigan', type: 'state' },
      { code: 'MN', name: 'Minnesota', type: 'state' },
      { code: 'MS', name: 'Mississippi', type: 'state' },
      { code: 'MO', name: 'Missouri', type: 'state' },
      { code: 'MT', name: 'Montana', type: 'state' },
      { code: 'NE', name: 'Nebraska', type: 'state' },
      { code: 'NV', name: 'Nevada', type: 'state' },
      { code: 'NH', name: 'New Hampshire', type: 'state' },
      { code: 'NJ', name: 'New Jersey', type: 'state' },
      { code: 'NM', name: 'New Mexico', type: 'state' },
      { code: 'NY', name: 'New York', type: 'state' },
      { code: 'NC', name: 'North Carolina', type: 'state' },
      { code: 'ND', name: 'North Dakota', type: 'state' },
      { code: 'OH', name: 'Ohio', type: 'state' },
      { code: 'OK', name: 'Oklahoma', type: 'state' },
      { code: 'OR', name: 'Oregon', type: 'state' },
      { code: 'PA', name: 'Pennsylvania', type: 'state' },
      { code: 'RI', name: 'Rhode Island', type: 'state' },
      { code: 'SC', name: 'South Carolina', type: 'state' },
      { code: 'SD', name: 'South Dakota', type: 'state' },
      { code: 'TN', name: 'Tennessee', type: 'state' },
      { code: 'TX', name: 'Texas', type: 'state' },
      { code: 'UT', name: 'Utah', type: 'state' },
      { code: 'VT', name: 'Vermont', type: 'state' },
      { code: 'VA', name: 'Virginia', type: 'state' },
      { code: 'WA', name: 'Washington', type: 'state' },
      { code: 'WV', name: 'West Virginia', type: 'state' },
      { code: 'WI', name: 'Wisconsin', type: 'state' },
      { code: 'WY', name: 'Wyoming', type: 'state' },
      { code: 'DC', name: 'District of Columbia', type: 'district' },
    ],
  },
  {
    countryCode: 'ZW',
    countryName: 'Zimbabwe',
    states: [
      { code: 'BU', name: 'Bulawayo', type: 'province' },
      { code: 'HA', name: 'Harare', type: 'province' },
      { code: 'MA', name: 'Manicaland', type: 'province' },
      { code: 'MC', name: 'Mashonaland Central', type: 'province' },
      { code: 'ME', name: 'Mashonaland East', type: 'province' },
      { code: 'MW', name: 'Mashonaland West', type: 'province' },
      { code: 'MV', name: 'Masvingo', type: 'province' },
      { code: 'MN', name: 'Matabeleland North', type: 'province' },
      { code: 'MS', name: 'Matabeleland South', type: 'province' },
      { code: 'MI', name: 'Midlands', type: 'province' },
    ],
  },
  {
    countryCode: 'ZM',
    countryName: 'Zambia',
    states: [
      { code: '01', name: 'Central', type: 'province' },
      { code: '02', name: 'Copperbelt', type: 'province' },
      { code: '03', name: 'Eastern', type: 'province' },
      { code: '04', name: 'Luapula', type: 'province' },
      { code: '05', name: 'Lusaka', type: 'province' },
      { code: '06', name: 'Northern', type: 'province' },
      { code: '07', name: 'North-Western', type: 'province' },
      { code: '08', name: 'Southern', type: 'province' },
      { code: '09', name: 'Western', type: 'province' },
    ],
  },
  {
    countryCode: 'ZA',
    countryName: 'South Africa',
    states: [
      { code: 'EC', name: 'Eastern Cape', type: 'province' },
      { code: 'FS', name: 'Free State', type: 'province' },
      { code: 'GP', name: 'Gauteng', type: 'province' },
      { code: 'KZN', name: 'KwaZulu-Natal', type: 'province' },
      { code: 'LP', name: 'Limpopo', type: 'province' },
      { code: 'MP', name: 'Mpumalanga', type: 'province' },
      { code: 'NC', name: 'Northern Cape', type: 'province' },
      { code: 'NW', name: 'North West', type: 'province' },
      { code: 'WC', name: 'Western Cape', type: 'province' },
    ],
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    states: [
      { code: 'AB', name: 'Alberta', type: 'province' },
      { code: 'BC', name: 'British Columbia', type: 'province' },
      { code: 'MB', name: 'Manitoba', type: 'province' },
      { code: 'NB', name: 'New Brunswick', type: 'province' },
      { code: 'NL', name: 'Newfoundland and Labrador', type: 'province' },
      { code: 'NS', name: 'Nova Scotia', type: 'province' },
      { code: 'ON', name: 'Ontario', type: 'province' },
      { code: 'PE', name: 'Prince Edward Island', type: 'province' },
      { code: 'QC', name: 'Quebec', type: 'province' },
      { code: 'SK', name: 'Saskatchewan', type: 'province' },
      { code: 'NT', name: 'Northwest Territories', type: 'territory' },
      { code: 'NU', name: 'Nunavut', type: 'territory' },
      { code: 'YT', name: 'Yukon', type: 'territory' },
    ],
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    states: [
      { code: 'ENG', name: 'England', type: 'country' },
      { code: 'SCT', name: 'Scotland', type: 'country' },
      { code: 'WLS', name: 'Wales', type: 'country' },
      { code: 'NIR', name: 'Northern Ireland', type: 'province' },
    ],
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    states: [
      { code: 'NSW', name: 'New South Wales', type: 'state' },
      { code: 'VIC', name: 'Victoria', type: 'state' },
      { code: 'QLD', name: 'Queensland', type: 'state' },
      { code: 'WA', name: 'Western Australia', type: 'state' },
      { code: 'SA', name: 'South Australia', type: 'state' },
      { code: 'TAS', name: 'Tasmania', type: 'state' },
      { code: 'ACT', name: 'Australian Capital Territory', type: 'territory' },
      { code: 'NT', name: 'Northern Territory', type: 'territory' },
    ],
  },
  {
    countryCode: 'NG',
    countryName: 'Nigeria',
    states: [
      { code: 'AB', name: 'Abia', type: 'state' },
      { code: 'AD', name: 'Adamawa', type: 'state' },
      { code: 'AK', name: 'Akwa Ibom', type: 'state' },
      { code: 'AN', name: 'Anambra', type: 'state' },
      { code: 'BA', name: 'Bauchi', type: 'state' },
      { code: 'BY', name: 'Bayelsa', type: 'state' },
      { code: 'BE', name: 'Benue', type: 'state' },
      { code: 'BO', name: 'Borno', type: 'state' },
      { code: 'CR', name: 'Cross River', type: 'state' },
      { code: 'DE', name: 'Delta', type: 'state' },
      { code: 'EB', name: 'Ebonyi', type: 'state' },
      { code: 'ED', name: 'Edo', type: 'state' },
      { code: 'EK', name: 'Ekiti', type: 'state' },
      { code: 'EN', name: 'Enugu', type: 'state' },
      { code: 'FC', name: 'Federal Capital Territory', type: 'territory' },
      { code: 'GO', name: 'Gombe', type: 'state' },
      { code: 'IM', name: 'Imo', type: 'state' },
      { code: 'JI', name: 'Jigawa', type: 'state' },
      { code: 'KD', name: 'Kaduna', type: 'state' },
      { code: 'KN', name: 'Kano', type: 'state' },
      { code: 'KT', name: 'Katsina', type: 'state' },
      { code: 'KE', name: 'Kebbi', type: 'state' },
      { code: 'KO', name: 'Kogi', type: 'state' },
      { code: 'KW', name: 'Kwara', type: 'state' },
      { code: 'LA', name: 'Lagos', type: 'state' },
      { code: 'NA', name: 'Nasarawa', type: 'state' },
      { code: 'NI', name: 'Niger', type: 'state' },
      { code: 'OG', name: 'Ogun', type: 'state' },
      { code: 'ON', name: 'Ondo', type: 'state' },
      { code: 'OS', name: 'Osun', type: 'state' },
      { code: 'OY', name: 'Oyo', type: 'state' },
      { code: 'PL', name: 'Plateau', type: 'state' },
      { code: 'RI', name: 'Rivers', type: 'state' },
      { code: 'SO', name: 'Sokoto', type: 'state' },
      { code: 'TA', name: 'Taraba', type: 'state' },
      { code: 'YO', name: 'Yobe', type: 'state' },
      { code: 'ZA', name: 'Zamfara', type: 'state' },
    ],
  },
  {
    countryCode: 'KE',
    countryName: 'Kenya',
    states: [
      { code: '01', name: 'Baringo', type: 'county' },
      { code: '02', name: 'Bomet', type: 'county' },
      { code: '03', name: 'Bungoma', type: 'county' },
      { code: '04', name: 'Busia', type: 'county' },
      { code: '05', name: 'Elgeyo-Marakwet', type: 'county' },
      { code: '06', name: 'Embu', type: 'county' },
      { code: '07', name: 'Garissa', type: 'county' },
      { code: '08', name: 'Homa Bay', type: 'county' },
      { code: '09', name: 'Isiolo', type: 'county' },
      { code: '10', name: 'Kajiado', type: 'county' },
      { code: '11', name: 'Kakamega', type: 'county' },
      { code: '12', name: 'Kericho', type: 'county' },
      { code: '13', name: 'Kiambu', type: 'county' },
      { code: '14', name: 'Kilifi', type: 'county' },
      { code: '15', name: 'Kirinyaga', type: 'county' },
      { code: '16', name: 'Kisii', type: 'county' },
      { code: '17', name: 'Kisumu', type: 'county' },
      { code: '18', name: 'Kitui', type: 'county' },
      { code: '19', name: 'Kwale', type: 'county' },
      { code: '20', name: 'Laikipia', type: 'county' },
      { code: '21', name: 'Lamu', type: 'county' },
      { code: '22', name: 'Machakos', type: 'county' },
      { code: '23', name: 'Makueni', type: 'county' },
      { code: '24', name: 'Mandera', type: 'county' },
      { code: '25', name: 'Marsabit', type: 'county' },
      { code: '26', name: 'Meru', type: 'county' },
      { code: '27', name: 'Migori', type: 'county' },
      { code: '28', name: 'Mombasa', type: 'county' },
      { code: '29', name: 'Murang\'a', type: 'county' },
      { code: '30', name: 'Nairobi', type: 'county' },
      { code: '31', name: 'Nakuru', type: 'county' },
      { code: '32', name: 'Nandi', type: 'county' },
      { code: '33', name: 'Narok', type: 'county' },
      { code: '34', name: 'Nyamira', type: 'county' },
      { code: '35', name: 'Nyandarua', type: 'county' },
      { code: '36', name: 'Nyeri', type: 'county' },
      { code: '37', name: 'Samburu', type: 'county' },
      { code: '38', name: 'Siaya', type: 'county' },
      { code: '39', name: 'Taita-Taveta', type: 'county' },
      { code: '40', name: 'Tana River', type: 'county' },
      { code: '41', name: 'Tharaka-Nithi', type: 'county' },
      { code: '42', name: 'Trans Nzoia', type: 'county' },
      { code: '43', name: 'Turkana', type: 'county' },
      { code: '44', name: 'Uasin Gishu', type: 'county' },
      { code: '45', name: 'Vihiga', type: 'county' },
      { code: '46', name: 'Wajir', type: 'county' },
      { code: '47', name: 'West Pokot', type: 'county' },
    ],
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    states: [
      { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'union territory' },
      { code: 'AP', name: 'Andhra Pradesh', type: 'state' },
      { code: 'AR', name: 'Arunachal Pradesh', type: 'state' },
      { code: 'AS', name: 'Assam', type: 'state' },
      { code: 'BR', name: 'Bihar', type: 'state' },
      { code: 'CH', name: 'Chandigarh', type: 'union territory' },
      { code: 'CT', name: 'Chhattisgarh', type: 'state' },
      { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'union territory' },
      { code: 'DL', name: 'Delhi', type: 'union territory' },
      { code: 'GA', name: 'Goa', type: 'state' },
      { code: 'GJ', name: 'Gujarat', type: 'state' },
      { code: 'HR', name: 'Haryana', type: 'state' },
      { code: 'HP', name: 'Himachal Pradesh', type: 'state' },
      { code: 'JK', name: 'Jammu and Kashmir', type: 'union territory' },
      { code: 'JH', name: 'Jharkhand', type: 'state' },
      { code: 'KA', name: 'Karnataka', type: 'state' },
      { code: 'KL', name: 'Kerala', type: 'state' },
      { code: 'LD', name: 'Lakshadweep', type: 'union territory' },
      { code: 'MP', name: 'Madhya Pradesh', type: 'state' },
      { code: 'MH', name: 'Maharashtra', type: 'state' },
      { code: 'MN', name: 'Manipur', type: 'state' },
      { code: 'ML', name: 'Meghalaya', type: 'state' },
      { code: 'MZ', name: 'Mizoram', type: 'state' },
      { code: 'NL', name: 'Nagaland', type: 'state' },
      { code: 'OR', name: 'Odisha', type: 'state' },
      { code: 'PY', name: 'Puducherry', type: 'union territory' },
      { code: 'PB', name: 'Punjab', type: 'state' },
      { code: 'RJ', name: 'Rajasthan', type: 'state' },
      { code: 'SK', name: 'Sikkim', type: 'state' },
      { code: 'TN', name: 'Tamil Nadu', type: 'state' },
      { code: 'TG', name: 'Telangana', type: 'state' },
      { code: 'TR', name: 'Tripura', type: 'state' },
      { code: 'UP', name: 'Uttar Pradesh', type: 'state' },
      { code: 'UT', name: 'Uttarakhand', type: 'state' },
      { code: 'WB', name: 'West Bengal', type: 'state' },
    ],
  },
]

/**
 * Get states/provinces for a country by country code or name
 */
export function getStatesForCountry(countryCodeOrName: string): StateProvince[] {
  const country = COUNTRIES_WITH_STATES.find(
    c => c.countryCode === countryCodeOrName || 
         c.countryName.toLowerCase() === countryCodeOrName.toLowerCase()
  )
  return country?.states || []
}

/**
 * Get country code from country name
 */
export function getCountryCode(countryName: string): string | undefined {
  const country = COUNTRIES_WITH_STATES.find(
    c => c.countryName.toLowerCase() === countryName.toLowerCase()
  )
  return country?.countryCode
}

/**
 * Check if a country has states/provinces defined
 */
export function hasStates(countryCodeOrName: string): boolean {
  return COUNTRIES_WITH_STATES.some(
    c => c.countryCode === countryCodeOrName || 
         c.countryName.toLowerCase() === countryCodeOrName.toLowerCase()
  )
}

