import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { Order, HUAJUAPAN_CENTER, PaymentMethod } from '../types';
import { Plus, Package, Clock, CheckCircle2, ChevronRight, Navigation2, X, CreditCard, Banknote, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OrderMap from './OrderMap';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderType, setNewOrderType] = useState<'delivery' | 'errand'>('delivery');
  const [requiresTrailer, setRequiresTrailer] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tip, setTip] = useState<number>(0);

  const [clientLocation, setClientLocation] = useState<{lat: number, lng: number} | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setClientLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Location error:', err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('clientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedOrder?.driverId) {
      setDriverLocation(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', selectedOrder.driverId), (doc) => {
      const driverData = doc.data();
      if (driverData?.location) {
        setDriverLocation(driverData.location);
      }
    });

    return () => unsubscribe();
  }, [selectedOrder]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !description) return;

    setIsSubmitting(true);
    try {
      const basePrice = 40;
      const trailerSurcharge = requiresTrailer ? 20 : 0;
      const finalPrice = basePrice + trailerSurcharge + tip;

      await addDoc(collection(db, 'orders'), {
        clientId: user.uid,
        driverId: null,
        status: 'pending',
        type: newOrderType,
        requiresTrailer,
        description,
        origin: clientLocation ? { ...clientLocation, address: 'Mi ubicación actual' } : { ...HUAJUAPAN_CENTER, address: 'Mi ubicación' },
        destination: { ...HUAJUAPAN_CENTER, address: 'Dirección de destino' },
        price: finalPrice,
        tip,
        paymentMethod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowNewOrder(false);
      setDescription('');
      setRequiresTrailer(false);
      setTip(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'picked_up': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const statusMap: Record<string, string> = {
    pending: 'Esperando repartidor',
    accepted: 'Repartidor en camino',
    picked_up: 'Pedido recolectado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Subscriptions & Actions */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Mis Mandados</h2>
            <button 
              onClick={() => setShowNewOrder(true)}
              className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-gray-100 rounded-3xl">
                <Package size={40} className="mx-auto text-gray-200 mb-2" />
                <p className="text-gray-400 font-medium">No tienes pedidos activos</p>
              </div>
            ) : (
              orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setRouteInfo(null);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    selectedOrder?.id === order.id 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]' 
                    : 'border-gray-50 hover:border-indigo-200 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl mr-4 ${selectedOrder?.id === order.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                      {order.type === 'delivery' ? <Package size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{order.description}</h4>
                      <div className={`text-[10px] uppercase font-black tracking-widest mt-1 inline-block px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                        {statusMap[order.status]}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className={`${selectedOrder?.id === order.id ? 'text-indigo-600' : 'text-gray-300'}`} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Area: Map & Details */}
      <div className="lg:col-span-8 h-[700px] flex flex-col space-y-6">
        <div className="flex-1 relative">
          <OrderMap 
            origin={selectedOrder?.origin} 
            destination={selectedOrder?.destination} 
            driverLocation={driverLocation || undefined}
            status={selectedOrder?.status}
            onRouteCalculated={setRouteInfo}
          />
          
          {selectedOrder && (
            <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <div className="bg-indigo-600 p-2 rounded-lg text-white mr-3">
                  <Navigation2 size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Seguimiento en vivo</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 gap-1 sm:gap-2">
                    <span>{statusMap[selectedOrder.status]}</span>
                    {routeInfo && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'pending' && (
                      <span className="font-medium text-indigo-600 bg-indigo-50 px-2 rounded-md">
                        ETA: {routeInfo.duration} ({routeInfo.distance})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right flex flex-col items-end">
                  <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">
                    {selectedOrder.paymentMethod === 'cash' && <Banknote size={10} className="text-emerald-500" />}
                    {selectedOrder.paymentMethod === 'card' && <CreditCard size={10} className="text-blue-500" />}
                    {selectedOrder.paymentMethod === 'transfer' && <QrCode size={10} className="text-purple-500" />}
                    <span>{selectedOrder.paymentMethod === 'cash' ? 'Efectivo' : selectedOrder.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                  </div>
                  <p className="text-lg font-black text-gray-900 leading-none">${selectedOrder.price}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="bg-gray-100 p-2 rounded-lg text-gray-400 hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedOrder && selectedOrder.status !== 'delivered' && (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center space-x-12">
              <div className="flex-1 flex items-center">
                <div className={`p-4 rounded-full mr-4 ${selectedOrder.status === 'accepted' || selectedOrder.status === 'picked_up' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">Paso actual</h4>
                  <p className="text-sm text-gray-500">
                    {selectedOrder.status === 'pending' && 'Buscando el mejor repartidor disponible...'}
                    {selectedOrder.status === 'accepted' && '¡Repartidor asignado! Va en camino al punto de origen.'}
                    {selectedOrder.status === 'picked_up' && 'Tu pedido ha sido recolectado y va hacia su destino.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      <AnimatePresence>
        {showNewOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewOrder(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 to-indigo-400"></div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Nuevo Mandado</h2>
              
              {!clientLocation && (
                <div className="mb-6 p-3 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200 flex items-start">
                  <span className="mr-2">⚠️</span>
                  <span>Obteniendo tu ubicación... Si no carga, revisa que los permisos de ubicación estén activados en tu navegador o abre la app en una nueva pestaña.</span>
                </div>
              )}
              {clientLocation && (
                <div className="mb-6 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200 flex items-center">
                  <CheckCircle2 size={14} className="mr-2" />
                  Ubicación GPS obtenida con éxito.
                </div>
              )}
              
              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setNewOrderType('delivery')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${newOrderType === 'delivery' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOrderType('errand')}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${newOrderType === 'errand' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Mandado
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Qué necesitas?</label>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Recoger medicinas en Farmacia Guadalajara..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all h-32 resize-none"
                    />
                  </div>

                  <label className="flex items-center space-x-3 p-3 rounded-2xl border-2 transition-all cursor-pointer border-gray-50 bg-gray-50 hover:border-gray-200">
                    <input
                      type="checkbox"
                      checked={requiresTrailer}
                      onChange={(e) => setRequiresTrailer(e.target.checked)}
                      className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">Requiere remolque (Mayor capacidad)</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">+ $20.00 MXN</span>
                    </div>
                  </label>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['cash', 'card', 'transfer'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                            paymentMethod === method 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                            : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                          }`}
                        >
                          {method === 'cash' && <Banknote size={20} />}
                          {method === 'card' && <CreditCard size={20} />}
                          {method === 'transfer' && <QrCode size={20} />}
                          <span className="text-[10px] font-bold mt-1 uppercase">
                            {method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : 'Transf.'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 ml-1">Agregar Propina (Incentiva a los repartidores)</label>
                    <div className="flex space-x-2">
                      {[0, 10, 20, 30].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTip(t)}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            tip === t 
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                            : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                          }`}
                        >
                          {t === 0 ? 'Nada' : `+$${t}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between border border-indigo-100">
                  <div className="flex flex-col">
                    <div className="flex items-center text-indigo-800">
                      <Navigation2 size={16} className="mr-2" />
                      <span className="text-sm font-bold">Tarifa estimada</span>
                    </div>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1">Máx. ${60 + tip} MXN garantizado</span>
                  </div>
                  <span className="text-lg font-black text-indigo-950">${40 + (requiresTrailer ? 20 : 0) + tip}.00</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                >
                  {isSubmitting ? 'Solicitando...' : 'Confirmar Pedido'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
