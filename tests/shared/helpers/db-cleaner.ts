export const clearEmulatorDatabase = async (projectId: string) => {
  try {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8081';
    const response = await fetch(`http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.warn(`Failed to clear database. Status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error clearing emulator database:', error);
  }
};
