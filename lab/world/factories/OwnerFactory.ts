export class OwnerFactory {
  public id: string;
  public properties: any[] = [];
  
  constructor() {
    this.id = `owner_${Math.random().toString(36).substr(2, 9)}`;
  }

  public withProperty(config?: any) {
    this.properties.push({ id: `prop_${Math.random().toString(36).substr(2, 9)}`, ...config });
    return this;
  }
}
