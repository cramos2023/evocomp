-- Create a function to handle cascaded deletion of snapshots and all dependencies
CREATE OR REPLACE FUNCTION delete_snapshot_cascade(p_snapshot_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Delete data dependent on scenarios linked to this snapshot
    DELETE FROM scenario_employee_results WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM scenario_results WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM scenario_rules WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM scenario_runs WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM proposals WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM comp_merit_effective_recommendations WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    DELETE FROM comp_merit_cycle_closures WHERE scenario_id IN (SELECT id FROM scenarios WHERE snapshot_id = p_snapshot_id);
    
    -- 2. Delete the scenarios themselves
    DELETE FROM scenarios WHERE snapshot_id = p_snapshot_id;
    
    -- 3. Delete employee data linked to the snapshot
    DELETE FROM snapshot_employee_data WHERE snapshot_id = p_snapshot_id;
    
    -- 4. Delete associated imports (optional but good for cleanup if one-to-one)
    DELETE FROM imports WHERE id IN (SELECT import_id FROM snapshots WHERE id = p_snapshot_id);
    
    -- 5. Finally delete the snapshot
    DELETE FROM snapshots WHERE id = p_snapshot_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION delete_snapshot_cascade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_snapshot_cascade(UUID) TO service_role;
