import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, X, Truck, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ─── Rwanda Administrative Data ───────────────────────────────────────────────
const RWANDA = {
  Kigali: {
    Gasabo:    ['Bumbogo','Gatsata','Gikomero','Gisozi','Jabana','Jali','Kacyiru','Kimihurura','Kimironko','Kinyinya','Ndera','Nduba','Remera','Rusororo','Rutunga'],
    Kicukiro: ['Gahanga','Gatenga','Gikondo','Kagarama','Kanombe','Kicukiro','Kigarama','Masaka','Niboye','Nyarugunga'],
    Nyarugenge:['Gitega','Kanyinya','Kigali','Kimisagara','Mageragere','Muhima','Nyakabanda','Nyamirambo','Nyarugenge','Rwezamenyo'],
  },
  Northern: {
    Burera:    ['Bungwe','Butaro','Cyanika','Cyeru','Gahunga','Gatebe','Gitovu','Kagogo','Kinoni','Kinyababa','Kivuye','Nemba','Rugarama','Rugendabari','Ruhunde','Rusarabuye','Rwerere'],
    Gakenke:   ['Busengo','Coko','Cyabingo','Gakenke','Gashenyi','Janja','Kamubuga','Karambo','Kivuruga','Mataba','Minazi','Muhondo','Muyongwe','Muzo','Nemba','Ruli','Rusasa','Rushashi'],
    Gicumbi:   ['Bukure','Bwisige','Byumba','Cyumba','Giti','Kaniga','Manyagiro','Miyove','Mukarange','Muko','Mutete','Nyamiyaga','Nyankenke','Rubaya','Rukomo','Rwamiko','Shangasha'],
    Musanze:   ['Busogo','Cyuve','Gacaca','Gashaki','Gataraga','Kimonyi','Kinigi','Muhoza','Mukamira','Muniga','Nkotsi','Nyange','Remera','Rwaza','Shingiro'],
    Rulindo:   ['Base','Burega','Bushoki','Buyoga','Cyinzuzi','Cyungo','Kinihira','Kisaro','Masoro','Mbogo','Murambi','Ngoma','Ntarabana','Rukozo','Rusiga','Shyorongi','Tumba'],
  },
  Southern: {
    Gisagara:  ['Gikonko','Gishubi','Kansi','Kibilizi','Kigembe','Mamba','Muganza','Mugombwa','Mukindo','Musha','Ndora','Nyanza','Save'],
    Huye:      ['Gishamvu','Huye','Karama','Kigoma','Kinazi','Maraba','Mbazi','Mukura','Ngoma','Ruhashya','Rusatira','Rwaniro','Simbi','Tumba'],
    Kamonyi:   ['Gacurabwenge','Karama','Kayenzi','Kayumbu','Mugina','Musambira','Ngamba','Nyamiyaga','Nyarubaka','Rugarika','Rukoma','Runda','Shyogwe'],
    Muhanga:   ['Cyeza','Kabacuzi','Kibangu','Kiyumba','Muhanga','Mushishiro','Nyabinoni','Nyamabuye','Nyamiyaga','Rongi','Rugendabari','Shyogwe'],
    Nyamagabe: ['Buruhukiro','Cyanika','Gasaka','Gatare','Kaduha','Kamegeri','Kibirizi','Kibumbwe','Kitabi','Mbazi','Mugano','Musange','Musebeya','Mushubi','Nkomane','Tare','Uworugeti'],
    Nyanza:    ['Busasamana','Busoro','Cyabakamyi','Kibirizi','Kigoma','Mukingo','Muyira','Ntyazo','Nyagisozi','Rwabicuma'],
    Nyaruguru: ['Cyahinda','Kibeho','Kivu','Mata','Muganza','Munini','Ngera','Ngoma','Nyabimata','Nyagisozi','Ruheru','Ruramba','Rusenge','Simbi','Ugenda'],
    Ruhango:   ['Bweramana','Byimana','Kabagari','Kinazi','Kinihira','Mbuye','Mwendo','Ntongwe','Ruhango'],
  },
  Eastern: {
    Bugesera:  ['Gashora','Juru','Kamabuye','Mareba','Mayange','Musenyi','Mwogo','Ngeruka','Ntarama','Nyamata','Nyarugenge','Rilima','Ruhuha','Rweru','Shyara'],
    Gatsibo:   ['Gasange','Gatsibo','Gitoki','Kabarore','Kageyo','Kiramuruzi','Kiziguro','Muhura','Murambi','Ngarama','Nyagihanga','Remera','Rugarama','Rwimbogo'],
    Kayonza:   ['Gahini','Kabare','Kabarondo','Mukarange','Murama','Murundi','Mwiri','Ndego','Nyamirama','Rukara','Ruramira','Rwinkwavu'],
    Kirehe:    ['Gahara','Gatore','Kigarama','Kigina','Kirehe','Mahama','Mpanga','Musaza','Mushikiri','Nasho','Nyamugari','Nyarubuye'],
    Ngoma:     ['Gashanda','Jarama','Karembo','Kazo','Kibungo','Mugesera','Murama','Mutenderi','Remera','Rukira','Rukumberi','Rwamagana'],
    Nyagatare: ['Karama','Karangazi','Katabagemu','Katranzige','Kibali','Kiyombe','Matimba','Mimuri','Mukama','Musheri','Nyagatare','Rukomo','Rwempasha','Rwimiyaga','Tabagwe'],
    Rwamagana: ['Fumbwe','Gahengeri','Gishari','Karenge','Kigabiro','Muhazi','Munyaga','Munyiginya','Musha','Muyumbu','Mwulire','Nyakariro','Nzige','Rubona'],
  },
  Western: {
    Karongi:   ['Bwishyura','Gishyita','Gitesi','Mubuga','Murambi','Murundi','Mutuntu','Rubengera','Rugabano','Ruganda','Rwankuba','Twumba'],
    Ngororero: ['Bwira','Gatumba','Hindiro','Kabaya','Kageyo','Kavumu','Matyazo','Muhanda','Muhororo','Ndaro','Ngororero','Nyange','Sovu'],
    Nyabihu:   ['Bigogwe','Jenda','Jomba','Kabatwa','Karago','Kintobo','Mukamira','Muringa','Rambura','Rurembo','Shyira'],
    Nyamasheke:['Bushekeri','Bushenge','Cyato','Gihombo','Kagano','Kanjongo','Karambi','Karengera','Kirimbi','Macuba','Mahembe','Nyabitekeri','Rangiro','Ruharambuga','Shangi'],
    Rubavu:    ['Bugeshi','Busasamana','Cyanzarwe','Gisenyi','Kanama','Kanzenze','Mudende','Nyamyumba','Nyundo','Rubavu','Rugerero'],
    Rusizi:    ['Bugarama','Butare','Bweyeye','Giheke','Gihundwe','Gikundamvura','Gitambi','Kamembe','Muganza','Mururu','Nkanka','Nkungu','Nyakabuye','Nyakarenzo','Nzahaha','Rwimbogo'],
    Rutsiro:   ['Boneza','Gihango','Kigeyo','Kivumu','Manishya','Mukura','Murunda','Musasa','Mushonyi','Mushubati','Nyabirasi','Ruhango','Rusebeya'],
  },
};

const PROVINCES  = Object.keys(RWANDA);
const districts  = (prov) => prov ? Object.keys(RWANDA[prov] || {}) : [];
const sectors    = (prov, dist) => (prov && dist) ? (RWANDA[prov]?.[dist] || []) : [];

// ─── Address Modal ─────────────────────────────────────────────────────────────
const EMPTY = {
  province: '', district: '', sector: '', street: '',
  postal_code: '', country: 'Rwanda', is_default: false,
};

const AddressModal = ({ initial, onClose, onSaved }) => {
  const isEdit = !!initial?.address_id;

  // Parse existing city back into province/district/sector
  const parseCity = (city = '') => {
    const parts = city.split(' / ');
    return {
      province: parts[0] || '',
      district: parts[1] || '',
      sector:   parts[2] || '',
    };
  };

  const parsed = isEdit ? parseCity(initial.city) : {};
  const [form, setForm] = useState({
    province:    parsed.province  || '',
    district:    parsed.district  || '',
    sector:      parsed.sector    || '',
    street:      initial?.street      || '',
    postal_code: initial?.postal_code || '',
    country:     initial?.country     || 'Rwanda',
    is_default:  initial?.is_default  || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Reset district when province changes
  const setProvince = (v) => setForm(f => ({ ...f, province: v, district: '', sector: '' }));
  const setDistrict = (v) => setForm(f => ({ ...f, district: v, sector: '' }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.province) return toast.error('Please select a province');
    if (!form.district) return toast.error('Please select a district');
    if (!form.sector)   return toast.error('Please select a sector');
    if (!form.street.trim()) return toast.error('Street / landmark is required');

    setSaving(true);
    try {
      // Encode Rwanda location into city field as "Province / District / Sector"
      const payload = {
        country:     'Rwanda',
        city:        `${form.province} / ${form.district} / ${form.sector}`,
        street:      form.street.trim(),
        postal_code: form.postal_code.trim() || null,
        is_default:  form.is_default,
      };
      if (isEdit) {
        await api.put(`/users/addresses/${initial.address_id}`, payload);
        toast.success('Address updated');
      } else {
        await api.post('/users/addresses', payload);
        toast.success('Address added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally { setSaving(false); }
  };

  const districtList = districts(form.province);
  const sectorList   = sectors(form.province, form.district);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Address' : 'Add Delivery Address'}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={save} className="modal-form">

          {/* Info banner */}
          <div style={{
            background: '#e8f4fd', borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: '#0077B6', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Truck size={15} />
            This address will be used for delivery of your orders.
          </div>

          {/* Province */}
          <div className="form-group">
            <label className="form-label">Province *</label>
            <select className="form-control" value={form.province} onChange={e => setProvince(e.target.value)} required>
              <option value="">— Select Province —</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p} Province</option>)}
            </select>
          </div>

          {/* District */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">District *</label>
              <select
                className="form-control"
                value={form.district}
                onChange={e => setDistrict(e.target.value)}
                disabled={!form.province}
                required
              >
                <option value="">— Select District —</option>
                {districtList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sector *</label>
              <select
                className="form-control"
                value={form.sector}
                onChange={e => set('sector', e.target.value)}
                disabled={!form.district}
                required
              >
                <option value="">— Select Sector —</option>
                {sectorList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Street / Landmark */}
          <div className="form-group">
            <label className="form-label">Street / Landmark *</label>
            <input
              className="form-control"
              placeholder="e.g. KG 11 Ave, Makuza Peace Plaza, Shop 203"
              value={form.street}
              onChange={e => set('street', e.target.value)}
              required
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Include building name, floor or nearby landmark for accurate delivery
            </div>
          </div>

          {/* Postal code */}
          <div className="form-group">
            <label className="form-label">Postal Code</label>
            <input
              className="form-control"
              placeholder="e.g. 00100 (optional)"
              value={form.postal_code}
              onChange={e => set('postal_code', e.target.value)}
            />
          </div>

          {/* Default checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none', marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={e => set('is_default', e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--primary)' }}
            />
            Set as my default delivery address
          </label>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Address Card ──────────────────────────────────────────────────────────────
const AddressCard = ({ address, onEdit, onDelete, onSetDefault }) => {
  const [deleting, setDeleting] = useState(false);

  // Parse city "Province / District / Sector"
  const parts   = (address.city || '').split(' / ');
  const province = parts[0] || '';
  const district = parts[1] || '';
  const sector   = parts[2] || '';

  const handleDelete = async () => {
    if (!window.confirm('Delete this address?')) return;
    setDeleting(true);
    try {
      await api.delete(`/users/addresses/${address.address_id}`);
      toast.success('Address deleted');
      onDelete(address.address_id);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete address';
      toast.error(msg, { duration: 5000 });
    } finally { setDeleting(false); }
  };

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${address.is_default ? 'var(--primary)' : 'transparent'}`,
        transition: 'box-shadow .15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: address.is_default ? '#e8f4fd' : '#f8f9fa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: address.is_default ? 'var(--primary)' : 'var(--text-muted)',
        }}>
          <MapPin size={20} />
        </div>
        <div style={{ flex: 1 }}>
          {address.is_default && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--primary)',
              background: '#e8f4fd', padding: '2px 8px', borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginBottom: 6,
            }}>
              <CheckCircle size={10} /> Default Address
            </span>
          )}

          {/* Street */}
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            {address.street}
          </div>

          {/* Rwanda location */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {sector && <span>{sector} Sector</span>}
            {district && <span> · {district} District</span>}
            {province && <span> · {province} Province</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {address.country}
            {address.postal_code && ` · ${address.postal_code}`}
          </div>
        </div>
      </div>

      {/* Delivery note */}
      <div style={{
        marginTop: 12, padding: '8px 12px', borderRadius: 8,
        background: '#f8f9fa', fontSize: 12, color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Truck size={12} />
        Vendor will deliver to this address
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 12,
        paddingTop: 12, borderTop: '1px solid #f0f0f0',
        flexWrap: 'wrap',
      }}>
        {!address.is_default && (
          <button
            className="btn btn-sm"
            style={{ background: '#e8f4fd', color: 'var(--primary)', border: 'none', fontSize: 12 }}
            onClick={() => onSetDefault(address.address_id)}
          >
            <Star size={12} /> Set Default
          </button>
        )}
        <button
          className="btn btn-sm"
          style={{ background: '#f3e8fd', color: '#7c3aed', border: 'none' }}
          onClick={() => onEdit(address)}
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          className="btn btn-sm"
          style={{ background: '#fde8ea', color: '#e63946', border: 'none' }}
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | address-object | 'new'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users/addresses');
      setAddresses(data || []);
    } catch { toast.error('Failed to load addresses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id) => {
    setAddresses(prev => prev.filter(a => a.address_id !== id));
  };

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/users/addresses/${id}`, { is_default: true });
      toast.success('Default address updated');
      load();
    } catch { toast.error('Failed to update default'); }
  };

  const defaultAddr = addresses.find(a => a.is_default);
  const otherAddrs  = addresses.filter(a => !a.is_default);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>My Addresses</h1>
          <p>Manage delivery addresses — vendors ship to these locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus size={16} /> Add Address
        </button>
      </div>

      {loading ? <div className="spinner" /> : addresses.length === 0 ? (
        /* Empty state */
        <div className="card" style={{ textAlign: 'center', padding: '70px 24px' }}>
          <MapPin
            size={56}
            color="var(--text-muted)"
            style={{ margin: '0 auto 16px', opacity: 0.25, display: 'block' }}
          />
          <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>No addresses saved</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
            Add a delivery address so vendors know where to send your orders in Rwanda.
          </p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={15} /> Add Your First Address
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Default address — full width highlight */}
          {defaultAddr && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
                Default Delivery Address
              </div>
              <AddressCard
                address={defaultAddr}
                onEdit={setModal}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            </div>
          )}

          {/* Other addresses grid */}
          {otherAddrs.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
                Other Addresses
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {otherAddrs.map(a => (
                  <AddressCard
                    key={a.address_id}
                    address={a}
                    onEdit={setModal}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                  />
                ))}
              </div>
            </div>
          )}

          {/* How delivery works */}
          <div className="card" style={{ background: '#f8f9fa', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={15} color="var(--primary)" /> How delivery works
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)', lineHeight: 2 }}>
              <li>When you place an order, your default address is automatically selected</li>
              <li>You can choose a different address at checkout</li>
              <li>The vendor receives your full address and delivers directly to you</li>
              <li>Addresses use Rwanda's Province → District → Sector hierarchy for accurate routing</li>
            </ul>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <AddressModal
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default Addresses;
