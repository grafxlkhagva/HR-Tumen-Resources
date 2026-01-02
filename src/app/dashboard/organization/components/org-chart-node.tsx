
import React from 'react';
import { Users } from 'lucide-react';
import { Department } from '../types';

export const OrgChartNode = ({ node }: { node: Department }) => {
    return (
        <li className="relative flex flex-col items-center">
            {/* Connector line to parent */}
            <div className="absolute bottom-full left-1/2 h-8 w-px -translate-x-1/2 bg-border"></div>

            <div className="relative z-10 w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
                <p className="font-semibold">{node.name}</p>
                <p className="text-sm text-muted-foreground">{node.typeName || 'Тодорхойгүй'}</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{node.filled || 0}</span>
                </div>
            </div>

            {node.children && node.children.length > 0 && (
                <ul className="relative mt-8 flex justify-center gap-8">
                    {/* Horizontal line connecting children */}
                    <li className="absolute top-0 h-px w-full -translate-y-8 bg-border" style={{
                        left: node.children.length > 1 ? `calc(50% - (100% * ${node.children.length - 1} / ${node.children.length}) / 2)` : '50%',
                        right: node.children.length > 1 ? `calc(50% - (100% * ${node.children.length - 1} / ${node.children.length}) / 2)` : '50%'
                    }}></li>
                    {node.children.map((child) => (
                        <OrgChartNode key={child.id} node={child} />
                    ))}
                </ul>
            )}
        </li>
    );
};

export const RootOrgChartNode = ({ node }: { node: Department }) => (
    <li className="relative flex flex-col items-center">
        <div className="relative z-10 w-56 rounded-lg border bg-card p-4 text-center text-card-foreground shadow-sm">
            <p className="font-semibold">{node.name}</p>
            <p className="text-sm text-muted-foreground">{node.typeName || 'Тодорхойгүй'}</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{node.filled || 0}</span>
            </div>
        </div>
        {node.children && node.children.length > 0 && (
            <>
                {/* Vertical line from root */}
                <div className="absolute top-full left-1/2 h-8 w-px -translate-x-1/2 bg-border"></div>

                <ul className="relative mt-8 flex justify-center gap-8">
                    {/* Horizontal line for children */}
                    <li className="absolute top-0 h-px w-full -translate-y-8 bg-border" style={{
                        left: node.children.length > 1 ? `calc(50% / ${node.children.length})` : '50%',
                        right: node.children.length > 1 ? `calc(50% / ${node.children.length})` : '50%'
                    }}></li>
                    {node.children.map((child) => (
                        <OrgChartNode key={child.id} node={child} />
                    ))}
                </ul>
            </>
        )}
    </li>
);
