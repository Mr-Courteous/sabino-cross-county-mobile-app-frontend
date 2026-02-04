import React, { createContext, ReactNode, useCallback, useState } from 'react';
import { School } from '@/utils/api-calls';

interface SchoolContextType {
  selectedSchool: School | null;
  schools: School[];
  setSelectedSchool: (school: School | null) => void;
  setSchools: (schools: School[]) => void;
  updateSchoolInList: (school: School) => void;
  removeSchoolFromList: (schoolId: number) => void;
}

export const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schools, setSchools] = useState<School[]>([]);

  const updateSchoolInList = useCallback((updatedSchool: School) => {
    setSchools((prev) =>
      prev.map((school) => (school.id === updatedSchool.id ? updatedSchool : school))
    );
    if (selectedSchool?.id === updatedSchool.id) {
      setSelectedSchool(updatedSchool);
    }
  }, [selectedSchool]);

  const removeSchoolFromList = useCallback((schoolId: number) => {
    setSchools((prev) => prev.filter((school) => school.id !== schoolId));
    if (selectedSchool?.id === schoolId) {
      setSelectedSchool(null);
    }
  }, [selectedSchool]);

  const value: SchoolContextType = {
    selectedSchool,
    schools,
    setSelectedSchool,
    setSchools,
    updateSchoolInList,
    removeSchoolFromList,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};

/**
 * Hook to use school context
 */
export const useSchool = (): SchoolContextType => {
  const context = React.useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
