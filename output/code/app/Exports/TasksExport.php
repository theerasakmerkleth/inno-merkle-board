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
            'Description (Plain Text)',
            'Status',
            'Priority',
            'Assignee',
            'Reporter',
            'Story Points',
            'Start Date',
            'Due Date',
            'Labels',
            'Checklist Progress'
        ];
    }

    public function map($task): array
    {
        // Strip HTML from description
        $plainDescription = strip_tags($task->description ?? '');
        // Truncate to avoid massive Excel cells, e.g., max 32767 chars in Excel, but keep it readable
        $plainDescription = strlen($plainDescription) > 500 ? substr($plainDescription, 0, 497) . '...' : $plainDescription;

        // Calculate Checklist Progress
        $checklistProgress = 'N/A';
        if ($task->checklists && $task->checklists->isNotEmpty()) {
            $firstChecklist = $task->checklists->first();
            $total = $firstChecklist->items->count();
            if ($total > 0) {
                $completed = $firstChecklist->items->where('is_completed', true)->count();
                $checklistProgress = "{$completed}/{$total}";
            } else {
                $checklistProgress = '0/0';
            }
        }

        return [
            $task->formatted_id,
            $task->title,
            $plainDescription,
            $task->column ? $task->column->title : $task->status,
            ucfirst($task->priority),
            $task->assignee ? $task->assignee->name : 'Unassigned',
            $task->reporter ? $task->reporter->name : 'System',
            $task->story_points ?? '',
            $task->start_date ? Date::dateTimeToExcel($task->start_date) : '',
            $task->due_date ? Date::dateTimeToExcel($task->due_date) : '',
            $task->labels ? implode(', ', $task->labels) : '',
            $checklistProgress
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Format dates correctly in Excel
        $sheet->getStyle('I2:J' . $sheet->getHighestRow())
              ->getNumberFormat()
              ->setFormatCode(\PhpOffice\PhpSpreadsheet\Style\NumberFormat::FORMAT_DATE_YYYYMMDD);

        return [
            // Style the first row as bold text.
            1    => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FFFFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FFDD3039'] // Merkle Red
                ]
            ],
        ];
    }
}

