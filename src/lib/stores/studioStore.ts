import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
export interface LayoutNode {
  id: string;
  type: string;
  props?: Record<string, any>;
  children?: LayoutNode[];
}

export interface WorkflowSchema {
  id: string;
  name: string;
  steps: any[];
}

export interface StudioNavItem {
  href: string;
  label: string;
  iconName: string; // Stored as icon name string for serialization
  description: string;
  feature?: string;
  tourId?: string;
}

export interface StudioNavGroup {
  title: string;
  items: StudioNavItem[];
}

export interface ScreenConfig {
  id: string;
  title: string;
  layout: LayoutNode;
}

interface StudioState {
  navigationGroups: StudioNavGroup[];
  screens: Record<string, ScreenConfig>;
  workflows: Record<string, WorkflowSchema>;
  testingLogs: string[];
  testStatus: 'idle' | 'running' | 'passed' | 'failed';
  
  // Actions
  setNavigationGroups: (groups: StudioNavGroup[]) => void;
  saveScreen: (id: string, screen: ScreenConfig) => void;
  saveWorkflow: (id: string, workflow: WorkflowSchema) => void;
  addTestingLog: (log: string) => void;
  setTestStatus: (status: 'idle' | 'running' | 'passed' | 'failed') => void;
  clearTestingLogs: () => void;
  resetToDefaults: () => void;
}

const DEFAULT_WIDGET_LAYOUT: LayoutNode = {
  id: 'root_grid',
  type: 'layout/grid',
  props: { columns: 12, gap: 4 },
  children: [
    {
      id: 'welcome_card',
      type: 'layout/card',
      props: { gridSpan: 12, title: 'Welcome to Studio Screen', description: 'Design me using drag and drop' },
      children: [
        {
          id: 'welcome_text',
          type: 'view/text',
          props: { value: 'This is a dynamic screen designed in real-time. Drag components from the panel to edit.', variant: 'p' }
        }
      ]
    }
  ]
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      navigationGroups: [],
      screens: {
        'studio-demo': {
          id: 'studio-demo',
          title: 'Studio Demo View',
          layout: DEFAULT_WIDGET_LAYOUT
        }
      },
      workflows: {},
      testingLogs: [],
      testStatus: 'idle',

      setNavigationGroups: (navigationGroups) => set({ navigationGroups }),
      
      saveScreen: (id, screen) => set((s) => ({
        screens: { ...s.screens, [id]: screen }
      })),
      
      saveWorkflow: (id, workflow) => set((s) => ({
        workflows: { ...s.workflows, [id]: workflow }
      })),
      
      addTestingLog: (log) => set((s) => ({
        testingLogs: [...s.testingLogs, log]
      })),
      
      setTestStatus: (testStatus) => set({ testStatus }),
      
      clearTestingLogs: () => set({ testingLogs: [] }),
      
      resetToDefaults: () => set({
        navigationGroups: [],
        screens: {
          'studio-demo': {
            id: 'studio-demo',
            title: 'Studio Demo View',
            layout: DEFAULT_WIDGET_LAYOUT
          }
        },
        workflows: {},
        testingLogs: [],
        testStatus: 'idle'
      })
    }),
    {
      name: 'studio-config-store',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
