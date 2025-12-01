import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { BuildingOfficeIcon, UserGroupIcon } from '@heroicons/react/24/outline'

interface OrganizationContextProps {
  className?: string
  showDetails?: boolean
}

export const OrganizationContext: React.FC<OrganizationContextProps> = ({ 
  className = '', 
  showDetails = true 
}) => {
  const { user, organization, currentRole } = useAuth()

  if (!user || !organization) {
    return null
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-900">
              {organization.name}
            </h3>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              currentRole === 'teacher' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              <UserGroupIcon className="h-3 w-3 mr-1" />
              {currentRole}
            </span>
          </div>
          
          {showDetails && organization.description && (
            <p className="text-xs text-blue-700 mt-1">
              {organization.description}
            </p>
          )}
          
          {showDetails && (
            <div className="flex items-center justify-between mt-2 text-xs text-blue-600">
              <span>User: {user.name}</span>
              <span>ID: {organization.organization_id.slice(0, 8)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrganizationContext