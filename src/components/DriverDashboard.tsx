import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  serverTimestamp,
  doc,
  setDoc
} from 'firebase/firestore';
import { Order, HUAJUAPAN_CENTER } from '../types';
import { 
  Bike, 
  MapPin, 
  CheckCircle2, 
  TrendingUp, 
  Navigation, 
  Package, 
  AlertCircle,
  Truck,
  CreditCard,
  Banknote,
  QrCode,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OrderMap from './OrderMap';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  const [initialRouteInfo, setInitialRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  const [deliverySummary, setDeliverySummary] = useState<{
    distance: string;
    duration: string;
    earnings: number;
    show: boolean;
  } | null>(null);

  useEffect(() => {
    if (activeOrder && routeInfo && !initialRouteInfo) {
      setInitialRouteInfo(routeInfo);
    }
  }, [routeInfo, activeOrder, initialRouteInfo]);

  useEffect(() => {
    if (!activeOrder) {
      setInitialRouteInfo(null);
    }
  }, [activeOrder]);

  // Sound notification (BEEP)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio notification failed:", e);
    }
  };

  // Detect new pending orders
  useEffect(() => {
    if (availableOrders.length > 0) {
      // Basic check: if current count is higher than what we've seen before
      // (Simplified for this demo, usually you'd check IDs)
      setShowNewOrderAlert(true);
      playNotificationSound();
      const timer = setTimeout(() => setShowNewOrderAlert(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [availableOrders.length]);
  useEffect(() => {
    if (!user || user.role !== 'driver') return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        const userDocRef = doc(db, 'users', user.uid);
        try {
          await updateDoc(userDocRef, {
            location: {
              lat: latitude,
              lng: longitude,
              updatedAt: serverTimestamp()
            }
          });
        } catch (error) {
          console.error("Error updating location:", error);
        }
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user]);

  // Listen for available (pending) orders
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAvailableOrders(orders);
    });

    return () => unsubscribe();
  }, []);

  // Listen for active order (accepted, picked_up)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('driverId', '==', user.uid),
      where('status', 'in', ['accepted', 'picked_up'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveOrder({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order);
      } else {
        setActiveOrder(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for completed orders and calculate earnings
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('driverId', '==', user.uid),
      where('status', '==', 'delivered'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setCompletedOrders(orders);
      const total = orders.reduce((sum, order) => sum + (order.price || 0), 0);
      setEarnings(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        driverId: user.uid,
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleUpdateStatus = async (status: 'picked_up' | 'delivered') => {
    if (!activeOrder) return;
    try {
      const orderRef = doc(db, 'orders', activeOrder.id);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });
      if (status === 'delivered') setRouteInfo(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showNewOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-indigo-400"
          >
            <div className="relative">
              <Bell size={20} className="animate-bounce" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <span className="font-bold text-sm">¡Nuevo pedido disponible!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar: Stats & Active Order Control */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-[10px] uppercase font-black tracking-widest mb-1">Acumulado Total</p>
            <h2 className="text-4xl font-black">${earnings.toFixed(2)}</h2>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl">
            <TrendingUp size={32} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <Truck size={20} className="mr-2 text-indigo-600" />
            Control de Pedido
          </h3>

          {!activeOrder ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
              <Bike size={40} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm font-medium">Buscando pedidos cercanos...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-700 block mb-1">Destino</span>
                    <p className="font-bold text-gray-900 leading-tight">{activeOrder.destination.address}</p>
                    {activeOrder.requiresTrailer && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 border border-orange-200">
                        📦 Remolque requerido
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-[10px] uppercase tracking-wider text-indigo-700 font-bold mb-0.5">
                      {activeOrder.paymentMethod === 'cash' && <Banknote size={10} />}
                      {activeOrder.paymentMethod === 'card' && <CreditCard size={10} />}
                      {activeOrder.paymentMethod === 'transfer' && <QrCode size={10} />}
                      <span>{activeOrder.paymentMethod === 'cash' ? 'Efectivo' : activeOrder.paymentMethod === 'card' ? 'Tarjeta' : 'Transf.'}</span>
                    </div>
                    <p className="text-lg font-black text-gray-900 leading-none">${activeOrder.price}</p>
                    {activeOrder.tip ? (
                      <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">
                        Incluye propina (${activeOrder.tip})
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                  <AlertCircle size={14} className="text-indigo-600" />
                  <span>{activeOrder.description}</span>
                </div>
              </div>

              <div className="space-y-3">
                {activeOrder.status === 'accepted' && (
                  <button
                    onClick={() => handleUpdateStatus('picked_up')}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Ya lo recogí
                  </button>
                )}
                {activeOrder.status === 'picked_up' && (
                  <button
                    onClick={() => handleUpdateStatus('delivered')}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Marcar como entregado
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm max-h-[400px] overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle2 size={20} className="mr-2 text-emerald-600" />
            Historial de Trabajo
          </h3>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {completedOrders.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm italic">Sin entregas registradas aún.</p>
            ) : (
              completedOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center">
                    <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm mr-3">
                      <Package size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-none mb-1 line-clamp-1">{order.description}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Entregado</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-gray-900">${order.price}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>


      {/* Main Area: Map & Available Pool */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        {!currentLocation && (
          <div className="mb-2 p-3 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200 flex items-start">
            <span className="mr-2">⚠️</span>
            <span>Obteniendo tu ubicación GPS... Si el mapa no te ubica, por favor acepta los permisos de ubicación o abre la app en una nueva pestaña.</span>
          </div>
        )}
        <div className="h-[450px] relative">
          <OrderMap 
            origin={activeOrder?.origin} 
            destination={activeOrder?.destination} 
            driverLocation={currentLocation || undefined}
            status={activeOrder?.status}
            onRouteCalculated={setRouteInfo}
          />
          {activeOrder && routeInfo && activeOrder.status !== 'delivered' && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-xl p-3 border border-white/50 shadow-lg flex items-center gap-3">
               <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-600 mb-0.5">Tiempo Estimado</p>
                  <p className="font-bold text-gray-900 leading-none">{routeInfo.duration}</p>
               </div>
               <div className="w-px h-8 bg-gray-200"></div>
               <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-600 mb-0.5">Distancia</p>
                  <p className="font-bold text-gray-900 leading-none">{routeInfo.distance}</p>
               </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex-1 overflow-hidden">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Navigation size={22} className="mr-2 text-indigo-600" />
            Pedidos Disponibles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] pr-2">
            {availableOrders.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-400 font-medium italic">No hay mandados en este momento...</p>
              </div>
            ) : (
              availableOrders.map(order => (
                <div key={order.id} className="p-5 border border-gray-50 bg-gray-50/50 rounded-2xl hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm text-gray-400 group-hover:text-indigo-600 transition-colors">
                      {order.type === 'delivery' ? <Package size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-1 text-[8px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">
                        {order.paymentMethod === 'cash' && <Banknote size={8} />}
                        {order.paymentMethod === 'card' && <CreditCard size={8} />}
                        {order.paymentMethod === 'transfer' && <QrCode size={8} />}
                        <span>{order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'card' ? 'Tarjeta' : 'Transf.'}</span>
                      </div>
                      <span className="text-lg font-black text-gray-900">${order.price}</span>
                      {order.tip ? (
                        <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                          Inluye propina (${order.tip})
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1 leading-snug line-clamp-2">
                    {order.description}
                    {Date.now() - (order.createdAt?.toMillis?.() || 0) < 60000 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white animate-pulse">
                        Nuevo
                      </span>
                    )}
                    {order.requiresTrailer && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-orange-100 text-orange-700 border border-orange-200">
                        Remolque requerido
                      </span>
                    )}
                  </h4>
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                    <MapPin size={10} className="mr-1 text-indigo-600" />
                    Huajuapan Centro
                  </div>
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    disabled={!!activeOrder}
                    className="w-full mt-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-indigo-50 disabled:hover:text-indigo-700"
                  >
                    Aceptar pedido
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
