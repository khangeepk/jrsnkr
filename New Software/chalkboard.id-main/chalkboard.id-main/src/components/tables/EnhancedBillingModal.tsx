'use client';
import React, { useState, useEffect } from 'react';
import { Modal, Button, Select, Label, TextInput } from 'flowbite-react';
import { IconEdit, IconDeviceFloppy, IconX, IconClock, IconCurrencyDollar, IconLoader2 } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface BillingData {
  session: {
    id: number;
    customerName: string;
    customerPhone?: string;
    startTime: string;
    endTime: string;
  };
  billing: {
    actualDuration: number;
    originalDuration: number;
    calculatedDuration: number;
    billingDetails: {
      type: 'hourly' | 'per_minute';
      rate: number;
      actualMinutes: number;
      billableHours?: number;
      billableMinutes?: number;
    };
    tableCost: number;
    fnbTotalCost: number;
    totalCost: number;
    fnbOrders: any[];
  };
  playerCredit?: {
    playerName: string;
    totalOutstanding: number;
  };
  paymentMethod?: string;
  transferToPlayerName?: string;
}

interface EnhancedBillingModalProps {
  show: boolean;
  onClose: () => void;
  billingData: BillingData | null;
  onConfirmPayment: (finalBillingData: BillingData) => void;
}

const EnhancedBillingModal: React.FC<EnhancedBillingModalProps> = ({
  show,
  onClose,
  billingData,
  onConfirmPayment
}) => {
  const tCommon = useTranslations('Common');
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [editedDuration, setEditedDuration] = useState(0);
  const [editedDurationType, setEditedDurationType] = useState<'hourly' | 'per_minute'>('hourly');
  const [recalculatedBilling, setRecalculatedBilling] = useState<BillingData | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculationError, setRecalculationError] = useState<string | null>(null);

  // New Payment Action states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'credit' | 'transfer'>('cash');
  const [transferToPlayerName, setTransferToPlayerName] = useState('');

  useEffect(() => {
    if (billingData) {
      setEditedDuration(billingData.billing.actualDuration);
      setEditedDurationType(billingData.billing.billingDetails.type);
      setRecalculatedBilling(null);
      setIsEditingDuration(false);
      setRecalculationError(null);
    }
  }, [billingData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (totalMinutes: number) => {
    const currentDurationType = billingData?.billing.billingDetails.type;
    if (currentDurationType === 'hourly') {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);
      return `${hours} ${tCommon('hours')} ${minutes} ${tCommon('minutes')}`;
    } else {
      const minutes = Math.floor(totalMinutes);
      const seconds = Math.round((totalMinutes - minutes) * 60);
      return `${minutes} ${tCommon('min')} ${seconds} ${tCommon('sec')}`;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRecalculateBilling = async () => {
    if (!billingData) return;

    setIsRecalculating(true);
    setRecalculationError(null);

    try {
      const response = await fetch(`/api/table-sessions/${billingData.session.id}/recalculate-billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualDuration: editedDuration,
          durationType: editedDurationType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecalculatedBilling({
          session: billingData.session,
          billing: data.billing
        });
        setIsEditingDuration(false);
      } else {
        const error = await response.json();
        setRecalculationError(error.message || tCommon('failedToRecalculateBilling'));
      }
    } catch (error) {
      setRecalculationError(tCommon('errorRecalculatingBilling'));
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleCancelEdit = () => {
    if (billingData) {
      setEditedDuration(billingData.billing.actualDuration);
      setEditedDurationType(billingData.billing.billingDetails.type);
    }
    setIsEditingDuration(false);
    setRecalculationError(null);
  };

  const handleConfirmPayment = () => {
    const finalData = recalculatedBilling || billingData;
    if (finalData) {
      if (paymentMethod === 'transfer' && !transferToPlayerName.trim()) {
        // We need a name to transfer to. (in a real app, this should trigger a validation alert)
        return;
      }
      onConfirmPayment({
        ...finalData,
        paymentMethod,
        transferToPlayerName: paymentMethod === 'transfer' ? transferToPlayerName.trim() : undefined,
      });
    }
  };

  const currentBilling = recalculatedBilling || billingData;

  if (!billingData) return null;

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <Modal.Header>
        <div className="flex items-center gap-2">
          <IconCurrencyDollar className="w-5 h-5" />
          Session Billing Confirmation
        </div>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          {/* Session Info */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-3">
              Session Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-bodytext">Customer:</span>
                <span className="ml-2 font-medium text-dark dark:text-white">
                  {billingData.session.customerName}
                </span>
              </div>
              <div>
                <span className="text-bodytext">Start Time:</span>
                <span className="ml-2 font-medium text-dark dark:text-white">
                  {formatDateTime(billingData.session.startTime)}
                </span>
              </div>
              <div>
                <span className="text-bodytext">End Time:</span>
                <span className="ml-2 font-medium text-dark dark:text-white">
                  {formatDateTime(billingData.session.endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Duration Management */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                {tCommon('durationAndBillingType')}
              </h3>
              {!isEditingDuration && (
                <Button
                  size="xs"
                  color="secondary"
                  onClick={() => setIsEditingDuration(true)}
                >
                  <IconEdit className="w-3 h-3 mr-1" />
                  Edit Duration
                </Button>
              )}
            </div>

            {isEditingDuration ? (
              <div className="space-y-4 bg-lightinfo p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editDuration" value={tCommon('durationMinutes')} />
                    <TextInput
                      id="editDuration"
                      type="number"
                      value={editedDuration}
                      onChange={(e) => setEditedDuration(parseInt(e.target.value) || 0)}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="durationType" value={tCommon('billingType')} />
                    <Select
                      id="durationType"
                      value={editedDurationType}
                      onChange={(e) => setEditedDurationType(e.target.value as 'hourly' | 'per_minute')}
                    >
                      <option value="hourly">{tCommon('hourlyRate')}</option>
                      <option value="per_minute">{tCommon('perMinuteRate')}</option>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="xs"
                    color="primary"
                    onClick={handleRecalculateBilling}
                    disabled={isRecalculating}
                  >
                    {isRecalculating ? (
                      <>
                        <IconLoader2 className="w-3 h-3 mr-1 animate-spin" />
                        Recalculating...
                      </>
                    ) : (
                      <>
                        <IconDeviceFloppy className="w-3 h-3 mr-1" />
                        Recalculate
                      </>
                    )}
                  </Button>
                  <Button
                    size="xs"
                    color="secondary"
                    onClick={handleCancelEdit}
                    disabled={isRecalculating}
                  >
                    <IconX className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>

                {recalculationError && (
                  <div className="text-error text-sm">
                    {recalculationError}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-bodytext">Duration:</span>
                  <div className="font-medium text-dark dark:text-white">
                    {formatTime(currentBilling?.billing.actualDuration || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-bodytext">{tCommon('billingType')}:</span>
                  <div className="font-medium text-dark dark:text-white">
                    {currentBilling?.billing.billingDetails.type === 'hourly' ? tCommon('hourlyRate') : tCommon('perMinuteRate')}
                  </div>
                </div>
              </div>
            )}

            {recalculatedBilling && (
              <div className="mt-3 p-3 bg-lightsuccess rounded-lg">
                <p className="text-success text-sm font-medium">
                  ✓ Billing has been recalculated with new duration and billing type
                </p>
              </div>
            )}
          </div>

          {/* Cost Breakdown */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-3">
              Cost Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-bodytext">Table Cost:</span>
                <span className="font-medium text-dark dark:text-white">
                  {formatCurrency(currentBilling?.billing.tableCost || 0)}
                </span>
              </div>
              {currentBilling?.billing.billingDetails.type === 'hourly' && (
                <div className="flex justify-between text-xs text-bodytext">
                  <span>({currentBilling.billing.billingDetails.billableHours} {tCommon('hours')} × {formatCurrency(currentBilling.billing.billingDetails.rate)})</span>
                  <span></span>
                </div>
              )}
              {currentBilling?.billing.billingDetails.type === 'per_minute' && (
                <div className="flex justify-between text-xs text-bodytext">
                  <span>({currentBilling.billing.billingDetails.billableMinutes} {tCommon('minutes')} × {formatCurrency(currentBilling.billing.billingDetails.rate)})</span>
                  <span></span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-bodytext">F&B Orders:</span>
                <span className="font-medium text-dark dark:text-white">
                  {formatCurrency(currentBilling?.billing.fnbTotalCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span className="text-dark dark:text-white">Current Game Charge:</span>
                <span className="text-primary">
                  {formatCurrency(currentBilling?.billing.totalCost || 0)}
                </span>
              </div>

              {/* Smart Checkout: Previous Credit & Combined Total */}
              {(currentBilling?.playerCredit && currentBilling.playerCredit.totalOutstanding > 0) && (
                <>
                  <div className="flex justify-between text-sm text-error mt-2">
                    <span>Previous Outstanding Credit:</span>
                    <span className="font-medium">
                      {formatCurrency(currentBilling.playerCredit.totalOutstanding)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                    <span className="text-dark dark:text-white">Combined Total:</span>
                    <span className="text-primary">
                      {formatCurrency((currentBilling?.billing.totalCost || 0) + currentBilling.playerCredit.totalOutstanding)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Actions */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-3">
              Payment Method
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                size="sm"
                color={paymentMethod === 'cash' ? 'primary' : 'light'}
                onClick={() => setPaymentMethod('cash')}
              >
                Cash
              </Button>
              <Button
                size="sm"
                color={paymentMethod === 'online' ? 'primary' : 'light'}
                onClick={() => setPaymentMethod('online')}
              >
                Online
              </Button>
              <Button
                size="sm"
                color={paymentMethod === 'credit' ? 'primary' : 'light'}
                onClick={() => setPaymentMethod('credit')}
              >
                Credit
              </Button>
              <Button
                size="sm"
                color={paymentMethod === 'transfer' ? 'primary' : 'light'}
                onClick={() => setPaymentMethod('transfer')}
              >
                Move To Opponent
              </Button>
            </div>

            {paymentMethod === 'transfer' && (
              <div className="mt-2">
                <Label htmlFor="transferTo" value="Move To Player Name *" />
                <TextInput
                  id="transferTo"
                  value={transferToPlayerName}
                  onChange={(e) => setTransferToPlayerName(e.target.value)}
                  placeholder="Enter opponent's name"
                  required
                />
              </div>
            )}

            {paymentMethod === 'credit' && (
              <p className="text-xs text-info mt-2">
                This amount will be added to {currentBilling?.playerCredit?.playerName || 'the player'}'s ledger.
              </p>
            )}
          </div>

          {/* F&B Orders (if any) */}
          {currentBilling?.billing.fnbOrders && currentBilling.billing.fnbOrders.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-3">
                F&B Orders ({currentBilling?.billing.fnbOrders?.length})
              </h3>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {currentBilling?.billing.fnbOrders?.map((order: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm p-2 bg-lightgray rounded">
                    <span>{order.orderNumber}</span>
                    <span className="font-medium">{formatCurrency(parseFloat(order.total))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          color="primary"
          onClick={handleConfirmPayment}
          disabled={isRecalculating}
        >
          <IconCurrencyDollar className="w-4 h-4 mr-2" />
          Confirm & Process Payment
        </Button>
        <Button
          color="secondary"
          onClick={onClose}
          disabled={isRecalculating}
        >
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EnhancedBillingModal;