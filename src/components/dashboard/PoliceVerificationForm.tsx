
'use client'

import React from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import type { Guest, PG } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface PoliceVerificationFormProps {
  guest: Guest | null;
  pgs: PG[];
}

const styles = {
  page: {
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      margin: '10mm auto',
      border: '1px #D3D3D3 solid',
      borderRadius: '5px',
      background: 'white',
      boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)',
      fontFamily: 'Arial, sans-serif',
      color: '#333',
  },
  header: {
      textAlign: 'center' as 'center',
      borderBottom: '2px solid #333',
      paddingBottom: '10px',
      marginBottom: '20px',
  },
  h1: {
      margin: '0',
      fontSize: '24px',
  },
  section: {
      marginBottom: '20px',
  },
  h2: {
      fontSize: '18px',
      borderBottom: '1px solid #eee',
      paddingBottom: '5px',
      marginBottom: '10px',
  },
  grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
  },
  gridItem: {
      
  },
  label: {
      fontWeight: 'bold' as 'bold',
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px',
  },
  value: {
      fontSize: '14px',
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      backgroundColor: '#f9f9f9',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  documentImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain' as 'contain',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginTop: '10px',
  },
  pageBreak: {
      pageBreakAfter: 'always' as 'always'
  }
};


const FormContent = ({ guest, pgs }: PoliceVerificationFormProps) => {
  if (!guest) return null;
  const pg = pgs.find(p => p.id === guest.pgId);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>Tenant Verification Form</h1>
      </header>
      
      <section style={styles.section}>
        <h2 style={styles.h2}>Tenant Details</h2>
        <div style={styles.grid}>
          <div style={styles.gridItem}>
            <span style={styles.label}>Full Name:</span>
            <div style={styles.value}>{guest.name}</div>
          </div>
          <div style={styles.gridItem}>
            <span style={styles.label}>Phone Number:</span>
            <div style={styles.value}>{guest.phone}</div>
          </div>
          <div style={styles.gridItem}>
            <span style={styles.label}>Email Address:</span>
            <div style={styles.value}>{guest.email}</div>
          </div>
           <div style={styles.gridItem}>
            <span style={styles.label}>Move-in Date:</span>
            <div style={styles.value}>{format(parseISO(guest.moveInDate), 'dd-MM-yyyy')}</div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Property Details</h2>
        <div style={styles.grid}>
            <div style={styles.gridItem}>
                <span style={styles.label}>Property Name:</span>
                <div style={styles.value}>{pg?.name}</div>
            </div>
            <div style={{ ...styles.gridItem, ...styles.fullWidth }}>
                <span style={styles.label}>Property Address:</span>
                <div style={styles.value}>{pg?.location}, {pg?.city}</div>
            </div>
        </div>
      </section>
      
      {guest.documents && guest.documents.map((doc, index) => (
        <React.Fragment key={uuidv4()}>
            <div style={styles.pageBreak}></div>
             <section style={styles.section}>
                <h2 style={styles.h2}>Document: {doc.label}</h2>
                <Image
                  src={doc.url}
                  alt={doc.label}
                  width={500}
                  height={300}
                  style={styles.documentImage}
                />
            </section>
        </React.Fragment>
      ))}

    </div>
  );
};


// The issue is with react-to-print and functional components with forwardRef.
// Wrapping it in a class component provides a stable node for the library to find.
class PoliceVerificationForm extends React.Component<PoliceVerificationFormProps> {
  render() {
    return <FormContent {...this.props} />;
  }
}

export default PoliceVerificationForm;
