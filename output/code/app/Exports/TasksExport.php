<?php

namespace App\Exports;

use App\Models\Task;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Illuminate\Support\Collection;

class TasksExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $projectId;
    protected $boardId;

    public function __construct($projectId, $boardId = null)
    {
        $this->projectId = $projectId;
        $this->boardId = $boardId;
    }

    /**
    * @return \Illuminate\Support\Collection
    */
    public function collection()
    {
        $query = Task::with(['assignee', 'reporter', 'column', 'project', 'checklists.items'])
            ->where('project_id', $this->projectId);

        if ($this->boardId) {
            $query->where('board_id', $this->boardId);
        }

        return $query->orderBy('board_column_id')->orderBy('project_task_number')->get();
    }

    public function headings(): array
    {
        return [
            'Task Key',
            'Title',
            'Status',
            'Priority',
            'Assignee',
            'Start Date',
            'Due Date',
            'Duration (Days)',
            'Conflict Status',
            'Story Points',
            'Labels',
            'Description (Plain Text)'
        ];
    }

    public function map($task): array
    {
        // Parse dates
        $start = $task->start_date ? new \DateTime($task->start_date) : null;
        $due = $task->due_date ? new \DateTime($task->due_date) : null;
        
        $duration = 'N/A';
        if ($start && $due) {
            $duration = $start->diff($due)->days + 1;
        }

        // Conflict check logic (simple version: due < start)
        $hasConflict = ($start && $due && $due < $start) ? 'YES (Invalid Range)' : 'NO';

        // Strip HTML from description
        $plainDescription = strip_tags($task->description ?? '');
        $plainDescription = strlen($plainDescription) > 500 ? substr($plainDescription, 0, 497) . '...' : $plainDescription;

        return [
            $task->formatted_id,
            $task->title,
            $task->column ? $task->column->title : $task->status,
            ucfirst($task->priority),
            $task->assignee ? $task->assignee->name : 'Unassigned',
            $task->start_date ? Date::dateTimeToExcel($start) : '',
            $task->due_date ? Date::dateTimeToExcel($due) : '',
            $duration,
            $hasConflict,
            $task->story_points ?? '0',
            $task->labels ? implode(', ', $task->labels) : '',
            $plainDescription
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Format dates correctly in Excel (Columns F and G)
        $sheet->getStyle('F2:G' . $sheet->getHighestRow())
              ->getNumberFormat()
              ->setFormatCode(\PhpOffice\PhpSpreadsheet\Style\NumberFormat::FORMAT_DATE_YYYYMMDD);

        return [
            // Style the first row: Zen Grey Header
            1    => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FF18181B'], // Zinc 900
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FFF4F4F5'] // Zinc 100
                ]
            ],
        ];
    }
}

