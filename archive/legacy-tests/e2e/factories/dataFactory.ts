import { v4 as uuidv4 } from 'uuid';

export const buildPropertyData = (tag: string = 'E2E') => {
    const id = uuidv4().slice(0, 8);
    return {
        name: `${tag}_PG_${id}`,
        location: `${tag} Street ${id}`,
        city: 'Pune',
        tag: id
    };
};

export const buildTenantData = (tag: string = 'E2E') => {
    const id = uuidv4().slice(0, 8);
    return {
        name: `${tag}_Tenant_${id}`,
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        rentAmount: '5000',
        tag: id
    };
};

export const buildStaffData = (tag: string = 'E2E') => {
    const id = uuidv4().slice(0, 8);
    return {
        name: `${tag}_Staff_${id}`,
        phone: `91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        role: 'manager',
        tag: id
    };
};
