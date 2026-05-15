import { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { HUAJUAPAN_CENTER } from '../types';
import { Truck, MapPin, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

interface MapProps {
  origin?: { lat: number, lng: number };
  destination?: { lat: number, lng: number };
  driverLocation?: { lat: number, lng: number };
  status?: string;
  onRouteCalculated?: (info: { distance: string, duration: string }) => void;
}

function RouteHandler({ origin, destination, driverLocation, status, onRouteCalculated }: MapProps) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map || !routesLibrary) return;
    setDirectionsService(new google.maps.DirectionsService());
    setDirectionsRenderer(new google.maps.DirectionsRenderer({ 
      map, 
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4f46e5',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    }));
  }, [map, routesLibrary]);

  useEffect(() => {
    if (directionsRenderer) {
      directionsRenderer.setOptions({
        polylineOptions: {
          strokeColor: status === 'picked_up' ? '#059669' : '#4f46e5',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
    }
  }, [directionsRenderer, status]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    const cleanOrigin = { lat: origin.lat, lng: origin.lng };
    const cleanDestination = { lat: destination.lat, lng: destination.lng };
    const cleanDriver = driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null;

    const request: google.maps.DirectionsRequest = {
      origin: cleanDriver || cleanOrigin,
      destination: cleanDestination,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      optimizeWaypoints: true
    };

    // If driver is assigned but hasn't picked up, routing should go via origin
    if (cleanDriver && status === 'accepted') {
      request.waypoints = [{ location: cleanOrigin, stopover: true }];
    }

    directionsService.route(
      request,
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          if (onRouteCalculated && result.routes[0]?.legs[0]) {
            const leg = result.routes[0].legs[0];
            onRouteCalculated({
              distance: leg.distance?.text || '',
              duration: leg.duration_in_traffic?.text || leg.duration?.text || ''
            });
          }
        }
      }
    );
  }, [directionsService, directionsRenderer, origin, destination, driverLocation, status, onRouteCalculated]);

  // Auto-fit bounds including ALL points
  useEffect(() => {
    if (!map || !origin || !destination) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    if (driverLocation) bounds.extend(driverLocation);
    
    map.fitBounds(bounds, { top: 120, right: 60, bottom: 60, left: 60 });
  }, [map, driverLocation, destination, origin]);

  return null;
}

export default function OrderMap({ origin, destination, driverLocation, status, onRouteCalculated }: MapProps) {
  if (!API_KEY) {
    return (
      <div className="bg-gray-100 rounded-3xl h-full flex items-center justify-center p-8 text-center border-2 border-dashed border-gray-200">
        <div>
          <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900 mb-2 font-sans tracking-tight">Mapa en modo espera</h3>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed">Configura tu clave de Google Maps en los secretos del proyecto para habilitar el seguimiento en vivo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 relative group">
      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={HUAJUAPAN_CENTER}
          defaultZoom={14}
          mapId="BERNARD_TRACKING_V2"
          disableDefaultUI={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {origin && (
            <AdvancedMarker position={origin}>
              <motion.div 
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="relative flex flex-col items-center"
              >
                <div className="bg-blue-600 p-2.5 rounded-full border-2 border-white shadow-xl z-10">
                  <UserIcon size={18} className="text-white" />
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600 -mt-[2px]"></div>
                <div className="w-5 h-1.5 bg-black/20 blur-[2px] rounded-[100%] mt-0.5"></div>
              </motion.div>
            </AdvancedMarker>
          )}

          {destination && (
            <AdvancedMarker position={destination}>
              <motion.div 
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="relative flex flex-col items-center"
              >
                <div className="bg-emerald-600 p-2.5 rounded-full border-2 border-white shadow-xl z-10">
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-600 -mt-[2px]"></div>
                <div className="w-5 h-1.5 bg-black/20 blur-[2px] rounded-[100%] mt-0.5"></div>
              </motion.div>
            </AdvancedMarker>
          )}

          <AnimatePresence mode="popLayout">
            {driverLocation && (
              <AdvancedMarker position={driverLocation}>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="relative cursor-pointer flex flex-col items-center"
                >
                  <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="relative z-10"
                  >
                    {/* Outer Radar Rings */}
                    <div className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-ping"></div>
                    <div className="absolute -inset-8 bg-indigo-500/10 rounded-full animate-pulse delay-75"></div>
                    
                    {/* Truck Container */}
                    <div className="bg-indigo-600 w-12 h-12 rounded-2xl border-2 border-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] relative flex items-center justify-center">
                      <Truck size={24} className="text-white" />
                    </div>
                  </motion.div>
                  
                  {/* Shadow underneath that scales when bouncing */}
                  <motion.div 
                    animate={{ scale: [1, 0.75, 1], opacity: [0.4, 0.15, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-8 h-2 bg-black/40 blur-[2px] rounded-[100%] mt-1"
                  />

                  {/* Label */}
                  <div className="absolute -top-6 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg whitespace-nowrap uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    Repartidor
                  </div>
                </motion.div>
              </AdvancedMarker>
            )}
          </AnimatePresence>

          <RouteHandler origin={origin} destination={destination} driverLocation={driverLocation} status={status} onRouteCalculated={onRouteCalculated} />
        </Map>
      </APIProvider>
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 pointer-events-none border-[12px] border-white/10 rounded-3xl ring-1 ring-black/5 ring-inset"></div>
    </div>
  );
}
