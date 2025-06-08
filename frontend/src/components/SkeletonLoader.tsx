import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width = '100%', 
  height = '1rem',
  rounded = false,
  animate = true 
}) => {
  return (
    <div
      className={`
        bg-gray-200 
        ${animate ? 'animate-pulse' : ''} 
        ${rounded ? 'rounded-full' : 'rounded'}
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// Card Skeleton
interface CardSkeletonProps {
  showAvatar?: boolean;
  lines?: number;
  isMobile?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  showAvatar = false, 
  lines = 3,
  isMobile = false 
}) => {
  return (
    <div className={`
      bg-white border border-gray-200 p-4 space-y-3
      ${isMobile ? 'rounded-lg' : 'rounded-xl'}
    `}>
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <Skeleton 
            width={isMobile ? 40 : 48} 
            height={isMobile ? 40 : 48} 
            rounded 
          />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton height={isMobile ? 16 : 20} width="75%" />
          <Skeleton height={14} width="50%" />
        </div>
      </div>
      
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton 
            key={index}
            height={12} 
            width={index === lines - 1 ? "60%" : "100%"} 
          />
        ))}
      </div>
      
      <div className="flex justify-between items-center pt-2">
        <Skeleton height={16} width="30%" />
        <Skeleton height={32} width={isMobile ? 80 : 100} />
      </div>
    </div>
  );
};

// Table Row Skeleton
interface TableRowSkeletonProps {
  columns?: number;
  isMobile?: boolean;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ 
  columns = 4,
  isMobile = false 
}) => {
  if (isMobile) {
    return <CardSkeleton isMobile />;
  }

  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton 
            height={16} 
            width={index === 0 ? "80%" : index === columns - 1 ? "60%" : "100%"} 
          />
        </td>
      ))}
    </tr>
  );
};

// Stats Card Skeleton
export const StatsCardSkeleton: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  return (
    <div className={`
      bg-white border border-gray-200 p-4 space-y-3
      ${isMobile ? 'rounded-lg' : 'rounded-xl'}
    `}>
      <div className="flex items-center justify-between">
        <Skeleton height={20} width="60%" />
        <Skeleton width={24} height={24} rounded />
      </div>
      <Skeleton height={32} width="40%" />
      <Skeleton height={12} width="70%" />
    </div>
  );
};

// List Skeleton
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  isMobile?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ 
  items = 5, 
  showAvatar = true,
  isMobile = false 
}) => {
  return (
    <div className={`space-y-${isMobile ? 3 : 4}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          {showAvatar && (
            <Skeleton 
              width={isMobile ? 32 : 40} 
              height={isMobile ? 32 : 40} 
              rounded 
            />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="70%" />
            <Skeleton height={12} width="50%" />
          </div>
          <Skeleton 
            height={isMobile ? 28 : 32} 
            width={isMobile ? 60 : 80} 
          />
        </div>
      ))}
    </div>
  );
};

// Page Skeleton
interface PageSkeletonProps {
  hasHeader?: boolean;
  hasFilters?: boolean;
  contentType?: 'cards' | 'table' | 'list';
  isMobile?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ 
  hasHeader = true,
  hasFilters = false,
  contentType = 'cards',
  isMobile = false 
}) => {
  return (
    <div className={`space-y-${isMobile ? 4 : 6}`}>
      {/* Header */}
      {hasHeader && (
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton height={isMobile ? 24 : 32} width="200px" />
            <Skeleton height={14} width="300px" />
          </div>
          <Skeleton 
            height={isMobile ? 40 : 44} 
            width={isMobile ? 100 : 120} 
          />
        </div>
      )}

      {/* Filters */}
      {hasFilters && (
        <div className={`
          flex gap-3 p-4 bg-gray-50 rounded-lg
          ${isMobile ? 'flex-col' : 'flex-row items-center'}
        `}>
          <Skeleton height={isMobile ? 44 : 40} width={isMobile ? '100%' : '200px'} />
          <Skeleton height={isMobile ? 44 : 40} width={isMobile ? '100%' : '150px'} />
          <Skeleton height={isMobile ? 44 : 40} width={isMobile ? '100%' : '100px'} />
        </div>
      )}

      {/* Stats */}
      <div className={`
        grid gap-4
        ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}
      `}>
        {Array.from({ length: 4 }).map((_, index) => (
          <StatsCardSkeleton key={index} isMobile={isMobile} />
        ))}
      </div>

      {/* Content */}
      <div>
        {contentType === 'cards' && (
          <div className={`
            grid gap-4
            ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}
          `}>
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} showAvatar isMobile={isMobile} />
            ))}
          </div>
        )}

        {contentType === 'table' && !isMobile && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <th key={index} className="px-6 py-3">
                      <Skeleton height={16} width="80%" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={5} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(contentType === 'table' && isMobile) || contentType === 'list' && (
          <ListSkeleton items={8} isMobile={isMobile} />
        )}
      </div>
    </div>
  );
};

export default Skeleton; 